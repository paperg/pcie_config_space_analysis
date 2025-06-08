from flask import Flask, render_template, jsonify, request
import os
from pciecfg.main import build_all_structures

app = Flask(__name__)

# Global variable to store current device data
current_device_bdf = None
current_config_space = None
current_registers = None


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
        global current_device_bdf, current_config_space, current_registers
        
        # 获取设备BDF参数（如果有的话）
        bdf = request.args.get('bdf', current_device_bdf)
        
        # 如果指定了新的BDF，更新当前设备数据

        current_device_bdf = bdf
        current_config_space = get_pcie_config_space_for_device(bdf)
        current_register_blocks = build_all_structures(current_config_space)
        print(f'Loaded config space for device {bdf}, found {len(current_register_blocks)} register blocks')

        if current_config_space is None:
            # 如果没有当前数据，使用默认配置空间
            current_config_space = get_pcie_config_space_for_device('00:00.0')  # 使用函数确保一致性
            current_register_blocks = build_all_structures(current_config_space)
            print(f'Loaded default config space, found {len(current_register_blocks)} register blocks')
        
        # 构建寄存器数据以供前端使用
        registers_data = []
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
    return jsonify({
        'value': register.get_value(),
        'fields': [{
            'name': field.name,
            'bits': field.bits,
            'value': field.value,
            'description': field.description,
            'rw': field.rw
        } for field in register.fields]
    })

@app.route('/api/register', methods=['POST'])
def set_register():
    data = request.get_json()
    value = int(data.get('value', 0))
    print(value)
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True) 
    # from thefuzz import fuzz
    # from thefuzz import process

    # choices = ['vendor_id', 'device_id', 'command', 'status', 'Advanced_Error_Reporting_Extended_Capability']
    
    # while True:
    #     query = input('Please input the register name: ')
    #     print(query)
    #     print(process.extractOne(query, choices))