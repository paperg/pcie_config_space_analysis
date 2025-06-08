from flask import Flask, render_template, jsonify, request
import os
from pciecfg.main import PCIeRegisterParser

app = Flask(__name__)

# Global variable to store current device data
current_device_bdf = None
current_config_space_parser = None
current_register_blocks = None


def get_pcie_config_space_for_device(bdf):
    """
    根据设备BDF获取PCIe配置空间数据
    这里使用mock数据，实际应用中应该从系统读取对应设备的配置空间
    """
    # 目前使用同一个配置空间文件作为示例
    try:
        with open('pciecfg/mock_data/config_space.bin', 'rb') as f:
            return f.read()
    except FileNotFoundError:
        # 备用配置空间文件
        print('config_space.bin not found')
        with open('config_space.bin', 'rb') as f:
            return f.read()

@app.route('/')
def index():
    return render_template('/layout.html')

@app.route('/index.html')
def register_detail():
    """
    寄存器详情页面
    可以通过URL参数传递寄存器信息
    """
    # 获取URL参数
    register_name = request.args.get('name')
    print(f"Requested register: {register_name}")
    
    # 如果有寄存器数据参数，则传递给模板
    context = {}
    if register_name and current_config_space_parser:
        try:
            # 从parser中获取寄存器对象
            register_obj = current_config_space_parser[register_name]
            print(f"Found register: {register_obj.name}")
            
            # 将寄存器对象转换为JSON可序列化的字典
            register_data = {
                'name': register_obj.name,
                'offset': register_obj.offset,
                'size': register_obj.size,
                'value': register_obj.value,
                'type': getattr(register_obj, 'type', 'unknown'),
                'fields': []
            }
            
            # 转换字段信息
            for field in register_obj.fields:
                field_data = {
                    'name': field.name,
                    'bit_offset': field.bit_offset,
                    'bit_width': field.bit_width,
                    'startBit': field.bit_offset,
                    'endBit': field.bit_offset + field.bit_width - 1,
                    'default': field.default,
                    'value': field.extract(register_obj.value),
                    'description': field.description,
                    'attributes': field.attributes,
                    'value_parse': field.value_parse
                }
                register_data['fields'].append(field_data)
            
            context['register_name'] = register_name
            context['register_data'] = register_data
            context['device_bdf'] = current_device_bdf
            
        except Exception as e:
            print(f"Error getting register {register_name}: {e}")
            context['error'] = f"无法找到寄存器: {register_name}"
    
    return render_template('/index.html', **context)

@app.route('/api/device')
def get_device():
    # get device list from lspci.txt
    # 返回JSON格式的设备列表
    print('get_device')
    try:
        with open('pciecfg/mock_data/lspci.txt', 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        return jsonify([])
    
    device_list = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # 解析格式: "00:00.0 System peripheral: Intel Corporation..."
        parts = line.split(' ', 1)
        if len(parts) >= 2:
            device_bdf = parts[0]
            device_name = parts[1]
            device_list.append({
                'bdf': device_bdf,
                'name': device_name,
                'description': device_name  # 添加description字段以兼容前端
            })
    
    print(f'Found {len(device_list)} devices')
    return jsonify(device_list)

@app.route('/api/memory/region')
def get_memory_region():
    try:
        global current_device_bdf, current_config_space, current_config_space_parser
        
        # 获取设备BDF参数（如果有的话）
        bdf = request.args.get('bdf', current_device_bdf)
        
        # 如果指定了新的BDF，更新当前设备数据

        current_device_bdf = bdf
        try:
            current_config_space = get_pcie_config_space_for_device(bdf)
            if current_config_space is None:
                raise Exception('No config space found')
            current_config_space_parser = PCIeRegisterParser(current_config_space)
            print(f'Loaded config space for device {bdf}')
        except Exception as e:
            print(f'Error loading config space for device {bdf}: {e}')
            return jsonify({
                'error': 'No config space found'
            }), 404

        
        # 构建寄存器数据以供前端使用
        registers_data = []
        current_register_blocks = current_config_space_parser.all_structures
        if current_register_blocks:
            for reg_struct in current_register_blocks:
                try:
                    block_reg = {
                        'name': reg_struct.name,
                        'offset': reg_struct.offset,
                        'size': reg_struct.size,
                        'registers': []
                    }

                    for reg in reg_struct.registers:
                        fields = reg.fields

                        register_data = {
                            'name': reg.name,
                            'offset': reg.offset,
                            'size': reg.size,
                            'value': reg.value,
                            'fields': []
                        }

                        # "bit": 0,
                        # "bit_width": 1,
                        # "name": "io_space_enable",
                        # "default": 0,
                        # "value_parse": {
                        #     "0": "I/O decoding disabled",
                        #     "1": "I/O decoding enabled"
                        # },
                        # "description": "I/O Space Enable - Controls a Function's response to I/O Space accesses. When this bit is Clear, all\nreceived I/O accesses are caused to be handled as Unsupported Requests. When this bit is Set, the\nFunction is enabled to decode the address and further process I/O Space accesses. For a Function with a\nType 1 Configuration Space Header, this bit controls the response to I/O Space accesses received on its\nPrimary Side.\nDefault value of this bit is 0b.\nThis bit is permitted to be hardwired to Zero if a Function does not support I/O Space accesses.\nThis bit does not apply to VFs and must be hardwired to Zero.",
                        # "attributes": "RW\nVF ROZ"
                        # name: str
                        # bit_offset: int
                        # bit_width: int
                        # default: int
                        # value_parse: str
                        # description: str
                        # attributes: str
                        for field in fields:
                            field_data = {
                                'name': field.name,
                                'bit_offset': field.bit_offset,
                                'bit_width': field.bit_width,
                                'default': field.default,
                                'value_parse': field.value_parse,
                                'description': field.description,
                                'attributes': field.attributes,
                                'value': reg[field.name]
                            }
                            register_data['fields'].append(field_data)

                        block_reg['registers'].append(register_data)
                
                    registers_data.append(block_reg)
                except Exception as e:
                    print(f'Error processing register {getattr(reg, "name", "unknown")}: {e}')
                    continue
        
        response_data = {
            'regions': [
                {
                    'name': 'PCIe Config Space',
                    'startAddress': 0x0,
                    'size': 0x1000,
                    'type': 'pcie',
                    'description': '4KB PCIe Configuration Space',
                    'registers_data': registers_data,
                    'raw_data': list(current_config_space) if current_config_space else []
                }
            ],
            
            'device_bdf': current_device_bdf,
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f'Error in get_memory_region: {e}')
        import traceback
        traceback.print_exc()
        
        # 返回错误但仍保持JSON格式
        return jsonify({
            'error': str(e),
            'regions': [],
            'registers': [],
            'device_bdf': None,
            'raw_data': []
        }), 500

@app.route('/api/register', methods=['GET'])
def get_register():
    """
    获取特定寄存器的详细信息
    参数：
    - bdf: 设备BDF
    - offset: 寄存器偏移地址
    - name: 寄存器名称 (可选)
    """
    try:
        global current_device_bdf, current_config_space, current_register_blocks
        
        bdf = request.args.get('bdf')
        offset = request.args.get('offset')
        name = request.args.get('name')
        
        if not bdf:
            return jsonify({'error': 'Missing bdf parameter'}), 400
            
        # 确保我们有该设备的数据
        if current_device_bdf != bdf or current_config_space is None:
            current_device_bdf = bdf
            current_config_space = get_pcie_config_space_for_device(bdf)
            current_register_blocks = build_all_structures(current_config_space)
        
        # 查找指定的寄存器
        target_register = None
        target_block = None
        
        if offset is not None:
            offset = int(offset, 16) if isinstance(offset, str) and offset.startswith('0x') else int(offset)
            
            # 按偏移地址查找
            for block in current_register_blocks:
                for reg in block.registers:
                    if reg.offset == offset:
                        target_register = reg
                        target_block = block
                        break
                if target_register:
                    break
        elif name:
            # 按名称查找
            for block in current_register_blocks:
                for reg in block.registers:
                    if reg.name == name:
                        target_register = reg
                        target_block = block
                        break
                if target_register:
                    break
        
        if not target_register:
            return jsonify({'error': 'Register not found'}), 404
        
        # 构建寄存器详细信息
        register_info = {
            'name': target_register.name,
            'offset': target_register.offset,
            'size': target_register.size,
            'value': target_register.value,
            'block_name': target_block.name if target_block else 'Unknown Block',
            'device_bdf': bdf,
            'fields': []
        }
        
        # 添加字段信息
        for field in target_register.fields:
            field_info = {
                'name': field.name,
                'bit_offset': field.bit_offset,
                'bit_width': field.bit_width,
                'startBit': field.bit_offset,
                'endBit': field.bit_offset + field.bit_width - 1,
                'default': field.default,
                'value': target_register[field.name],
                'description': field.description,
                'attributes': field.attributes,
                'value_parse': field.value_parse
            }
            register_info['fields'].append(field_info)
        
        return jsonify(register_info)
        
    except Exception as e:
        print(f'Error in get_register: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/register', methods=['POST'])
def set_register():
    data = request.get_json()
    value = int(data.get('value', 0))
    print(f'set_register: {value}')
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True) 