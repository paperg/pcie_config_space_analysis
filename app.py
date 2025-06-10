import os

from flask import Flask, render_template, jsonify, request
from pciecfg.main import PCIeRegisterParser
from pciecfg.main import PCIeDataFromOSGenerator
from pciecfg import common

app = Flask(__name__)

# Global variable to store current device data
current_device_bdf = None
current_config_space_parser = None
current_register_blocks = None
current_data_generator = PCIeDataFromOSGenerator("00:00.0")


def get_pcie_info(register_structs_list):
    registers_data = []
    for reg_struct in register_structs_list:
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
    
    return registers_data

@app.route('/')
def index():
    return render_template('/layout.html')

@app.route('/index.html')
def register_detail():
    global current_config_space_parser
    
    register_name = request.args.get('name')
    print(f"Requested register: {register_name}")
    
    context = {}
    if register_name and current_config_space_parser:
        try:
            register_obj = None
            obj_lists = current_config_space_parser[register_name]
            if isinstance(obj_lists, list):
                for obj in obj_lists:
                    # if it is Register
                    if isinstance(obj, common.Register):
                        register_obj = obj
                        break
            else:
                if isinstance(obj_lists, common.Register):
                    register_obj = obj_lists

            if register_obj is None:
                return jsonify({'error': 'Register not found'}), 404
            
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
        lines = current_data_generator.get_pcie_device_list()
    except FileNotFoundError:
        return jsonify([])
    
    device_list = []

    for line in lines:
        line = line.strip()
        if not line:
            continue
        # format: "00:00.0 System peripheral: Intel Corporation..."
        parts = line.split(' ', 1)
        
        if len(parts) < 2:
            continue
        
        if len(parts) >= 2:
            device_bdf = parts[0]
            device_name = parts[1]
            device_list.append({
                'bdf': device_bdf,
                'name': device_name,
                'description': device_name 
            })
    
    print(f'Found {len(device_list)} devices')
    return jsonify(device_list)

@app.route('/api/memory/region')
def get_memory_region():
    try:
        global current_device_bdf, current_config_space, current_config_space_parser
        
        bdf = request.args.get('bdf', current_device_bdf)
        current_device_bdf = bdf
        
        try:
            current_data_generator.bdf = bdf
            current_config_space_parser = PCIeRegisterParser(current_data_generator)
            print(f'Loaded config space for device {bdf}')
        except Exception as e:
            print(f'Error loading config space for device {bdf}: {e}')
            return jsonify({
                'error': 'No config space found'
            }), 404

        # pcie register for frontend
        registers_data = []
        response_data = {
            'regions': [],
            'device_bdf': current_device_bdf
        }
        
        regions = current_config_space_parser.region
        for region in regions:
            structures = region.reg_structure
            registers_data = get_pcie_info(structures)
            response_data['regions'].append({
                'name': region.name,
                'startAddress': region.start_address,
                'size': region.size,
                'type': region.type,
                'description': region.description,
                'registers_data': registers_data,
                'raw_data': list(region.raw_data) if region.raw_data else []
            })
        
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
    try:
        global current_device_bdf, current_config_space, current_register_blocks, current_config_space_parser
        print('Call get_register')
        bdf = request.args.get('bdf')
        offset = request.args.get('offset')
        name = request.args.get('name')
        
        if not bdf:
            return jsonify({'error': 'Missing bdf parameter'}), 400
            
        # 确保我们有该设备的数据
        if current_device_bdf != bdf or current_config_space_parser is None:
            current_device_bdf = bdf
            data_generator = PCIeDataFromOSGenerator(bdf)
            current_config_space_parser = PCIeRegisterParser(data_generator)
        
        # 查找指定的寄存器
        target_register = None

        if name is not None:
            target_register = current_config_space_parser[name]

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
    """
    更新寄存器值
    参数：
    - bdf: 设备BDF
    - value: 新的寄存器值
    - offset: 寄存器偏移地址 (可选)
    - name: 寄存器名称 (可选)
    """
    try:
        global current_device_bdf, current_config_space_parser
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Missing request data'}), 400
            
        bdf = data.get('bdf')
        value = data.get('value')
        offset = data.get('offset')
        name = data.get('name')
        
        if not bdf:
            return jsonify({'success': False, 'message': 'Missing bdf parameter'}), 400
            
        if value is None:
            return jsonify({'success': False, 'message': 'Missing value parameter'}), 400
            
        try:
            value = int(value)
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid value format'}), 400
            
        if not offset and not name:
            return jsonify({'success': False, 'message': 'Missing offset or name parameter'}), 400
        
        # 确保我们有该设备的数据
        if current_device_bdf != bdf or current_config_space_parser is None:
            try:
                current_device_bdf = bdf
                current_config_space = get_pcie_config_space_for_device(bdf)
                current_config_space_parser = PCIeRegisterParser(current_config_space)
            except Exception as e:
                return jsonify({
                    'success': False, 
                    'message': f'Failed to load device data: {str(e)}'
                }), 404
        
        # 查找目标寄存器
        target_register = None
        
        if name:
            # 按名称查找
            try:
                target_register = current_config_space_parser[name]
            except KeyError:
                pass
        
        if not target_register and offset is not None:
            # 按偏移地址查找
            offset = int(offset, 16) if isinstance(offset, str) and offset.startswith('0x') else int(offset)
            
            for reg_struct in current_config_space_parser.all_structures:
                for reg in reg_struct.registers:
                    if reg.offset == offset:
                        target_register = reg
                        break
                if target_register:
                    break
        
        if not target_register:
            return jsonify({
                'success': False, 
                'message': 'Register not found'
            }), 404
        
        # 模拟寄存器写入
        # 在实际应用中，这里应该写入到真实的PCIe配置空间
        print(f'Writing value 0x{value:08x} to register {target_register.name} at offset 0x{target_register.offset:03x} for device {bdf}')
        
        # 更新内存中的值（模拟写入）
        target_register.value = value
        
        # 返回成功响应
        return jsonify({
            'success': True,
            'message': 'Register updated successfully',
            'register': target_register.name,
            'offset': target_register.offset,
            'value': value
        })
        
    except Exception as e:
        print(f'Error in set_register: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False, 
            'message': f'Internal server error: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True) 