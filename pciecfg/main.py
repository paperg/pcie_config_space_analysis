
import sys
import os
import subprocess
import struct
from thefuzz import fuzz
from thefuzz import process

# add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from pci import build_pci_structures_from_json
from pcie import build_pcie_structures_from_json
from extend import build_pcie_extended_structures_from_json
from cxl import build_cxl_cache_mem_capability_from_json


class DataGenerator:
    def get_pcie_config_space(self):
        pass
    
    def get_bar_space(self, size: int):
        pass
    
    def set_pcie_register_value(self, offset: int, value: int):
        pass
    
    def set_bar_space(self, addr: int, offset: int, value: int):
        pass


class PCIeDataFromFileGenerator(DataGenerator):
    def __init__(self, bdf):
        self.bdf = bdf
        
    def get_pcie_config_space(self):
        with open("pciecfg/mock_data/config_space.bin", "rb") as f:
            config_space = bytearray(f.read())
        return config_space
    
    def get_bar_space(self, addr: int, offset: int, size: int):
        with open("pciecfg/mock_data/cxl_bar.bin", "rb") as f:
            bar_space = bytearray(f.read())
        return bar_space[:size]
    
    def set_pcie_register_value(self, offset: int, value: int):
        with open("pciecfg/mock_data/config_space.bin", "rb") as f:
            config_space = bytearray(f.read())
            
        config_space[offset] = value.to_bytes(4, 'little')
        with open("pciecfg/mock_data/config_space.bin", "wb") as f:
            f.write(config_space)
            
        return value
    
    def set_bar_space(self, addr: int, offset: int, value: int):
        with open("pciecfg/mock_data/cxl_bar.bin", "rb") as f:
            bar_space = bytearray(f.read())
        bar_space[offset] = value.to_bytes(4, 'little')
        with open("pciecfg/mock_data/cxl_bar.bin", "wb") as f:
            f.write(bar_space)
            
        return value

    def get_pcie_device_list(self):
        with open("pciecfg/mock_data/lspci.txt", "r") as f:
            return f.read()
        
class PCIeDataFromOSGenerator(DataGenerator):
    def __init__(self, bdf):
        self.bdf = bdf
    
    def get_pcie_config_space(self):
        cmd = ['sudo', 'lspci', '-xxxx', '-s', self.bdf]
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            config_space = self.parse_lspci_output(result.stdout.decode())
            print(f'cmd: {" ".join(cmd)} return data len: {len(config_space)}')
            return config_space
        except subprocess.CalledProcessError as e:
            print(f'Command failed: {e.stderr.decode()}')
            return None
    
    def get_bar_space(self, phys_addr: int, size: int):
        print(f'get_bar_space: 0x{phys_addr:x}, 0x{size:x}')
        cmd = ["mem_driver/mmio_tool", "r", hex(phys_addr), hex(size)]
        try:
            print(f'cmd: {cmd}')
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            print("Error running mmio_tool:", e.stderr)
            sys.exit(1)

        bin_data = bytearray()
        for line in result.stdout.splitlines():
            if line.startswith("Read"):
                # Parse: Read [0x12345678]: 0x89ABCDEF
                try:
                    parts = line.split()
                    val_hex = parts[-1]
                    val = int(val_hex, 16)
                    bin_data += struct.pack("<I", val)  # Little endian 4 bytes
                except Exception as e:
                    print("Parse error:", e)
                    continue

        return bytes(bin_data)
    
    def set_pcie_register_value(self, offset: int, value: int):
        pass
    
    def set_bar_space(self, addr: int, offset: int, value: int):
        pass

    def parse_lspci_output(self, output: str) -> bytes:
        lines = output.strip().splitlines()
        data = bytearray()

        # 跳过第一行（设备信息）
        for line in lines[1:]:
            # 形如 '00: 00 1b 02 c0 46 05 10 00 02 10 02 05 00 00 00 00'
            parts = line.split(':', 1)
            if len(parts) != 2:
                continue
            # parts[1] 是 ' 00 1b 02 c0 46 05 10 00 02 10 02 05 00 00 00 00'
            hex_bytes = parts[1].strip().split()
            for hb in hex_bytes:
                data.append(int(hb, 16))
        return bytes(data)

    def get_pcie_device_list(self):
        cmd = ['lspci']
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            output = result.stdout.decode()
            return output.splitlines()
        except subprocess.CalledProcessError as e:
            print(f'Command failed: {e.stderr.decode()}')
            

class Region:
    def __init__(self, name: str, start_address: int, size: int, type: str, description: str, raw_data: list, reg_structure: list):
        self.name = name
        self.start_address = start_address
        self.size = size
        self.type = type
        self.description = description
        self.raw_data = raw_data
        self.reg_structure = reg_structure

class PCIeRegisterParser:
    def __init__(self, data_generator: DataGenerator):
        self.data_generator = data_generator
        self.all_structures_map = {}
        self.region = []
        config_space = data_generator.get_pcie_config_space()
        if len(config_space) == 0:
            raise Exception('config_space is empty')
        
        self.pcie_structures = self.build_all_structures(config_space)
        if self.pcie_structures is not None:
            self.region.append(Region('PCIe Config Space', self.pci_addr_to_int(data_generator.bdf), 0x1000, 'pcie', '4KB PCIe Configuration Space', config_space, self.pcie_structures))
            self.generate_all_map(self.pcie_structures)
        self.cxl_structures = self.build_cxl_structures()
        if self.cxl_structures is not None:
            self.generate_all_map(self.cxl_structures)
    
    def __getitem__(self, key):
        correct_key, score = process.extractOne(key, self.all_structures_map.keys())
        if score > 80:
            print(f'Use {key}, You mean {correct_key}')
        else:
            print(f'Use {key}, score: {score}, May be you mean {correct_key}')
        return self.all_structures_map[correct_key]
    
    def generate_all_map(self, structures):
        for reg_struct in structures:
            self.all_structures_map[reg_struct.name] = reg_struct
            for reg in reg_struct.registers:
                if reg.name not in self.all_structures_map:
                    self.all_structures_map[reg.name] = reg
                else:
                    if isinstance(self.all_structures_map[reg.name], list):
                        self.all_structures_map[reg.name].append(reg)
                    else:
                        tmp = self.all_structures_map[reg.name]
                        self.all_structures_map[reg.name] = [tmp, reg]

                for field in reg.fields:
                    if field.name not in self.all_structures_map:
                        self.all_structures_map[field.name] = field
                    else:
                        if isinstance(self.all_structures_map[field.name], list):
                            self.all_structures_map[field.name].append(field)
                        else:
                            tmp = self.all_structures_map[field.name]
                            self.all_structures_map[field.name] = [tmp, field]
                    
    def build_cxl_structures(self):
        dvsec_cxl_device = self.all_structures_map.get('dvsec_register_locator')
        if dvsec_cxl_device is None:
            print('dvsec_cxl_device is None')
            return None
        
        for reg in dvsec_cxl_device.registers:
            if 'register_offset_low' in reg.name:
                reg_block_id = reg['Register_Block_Identifier']
                if reg_block_id == 0x1:
                    bar_num = reg['Register_BIR']
                    bar_reg = self.all_structures_map['base_address_registers_' + str(bar_num)]
                    if bar_reg['memory_type'] == 0:
                        # 32 bit
                        bar_base = bar_reg['address_mapping']
                    else:
                        # 64 bit
                        bar_base = bar_reg['address_mapping']
                        high_addr = self.all_structures_map['base_address_registers_' + str(bar_num + 1)].value
                        bar_base = (high_addr << 32) | (bar_base << 4)
                    print(f'BAR{bar_num} bar_base: 0x{bar_base:x}')
                    if bar_base != 0:
                        # 4K offset is cxl cache and mem register
                        bar_space = self.data_generator.get_bar_space(bar_base + 0x1000, 0x1000)
                        cxl_structures = build_cxl_cache_mem_capability_from_json(bar_space)
                        self.region.append(Region('CXL Cache and Mem', bar_base + 0x1000, 0x1000, 'cxl', 'CXL Cache and Mem', bar_space, cxl_structures))
                        return cxl_structures
                    
        return None
        
    def build_all_structures(self, config_space: bytes):
        all_structures = []
        structures = build_pci_structures_from_json(config_space)
        all_structures.extend(structures)
        structures = build_pcie_structures_from_json(config_space)
        all_structures.extend(structures)
        structures = build_pcie_extended_structures_from_json(config_space)
        all_structures.extend(structures)

        return all_structures

    def pci_addr_to_int(self, pci_addr: str) -> int:
        bus_dev, func = pci_addr.split('.')
        bus, dev = bus_dev.split(':')

        bus = int(bus, 16)
        dev = int(dev, 16)
        func = int(func, 16)

        addr = (bus << 16) | (dev << 11) | (func << 8)
        return addr

if __name__ == "__main__":
    
    ##########################################################
    # Test Get Device use cmd : lspci
    ##########################################################
    try:
        data_generator = PCIeDataFromOSGenerator("00:00.0")
        lines = data_generator.get_pcie_device_list()
    except FileNotFoundError:
        print('FileNotFoundError')

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
    print(device_list)
    
    ##########################################################
    # Test Get Data From File 
    ##########################################################
    # data_generator = PCIeDataGenerator("00:00.0")
    # parser = PCIeRegisterParser(data_generator)
    # print(parser[
    #     'uncorrectable_error_status'
    # ])
    # for reg_struct in all_structures:
    #     print(reg_struct.name)
    #     for reg in reg_struct.registers:
    #         for field in reg.fields:
    #             print(field.name, reg[field.name])
    
    ## Data From OS CMD Test
    # data_generator = PCIeDataFromOSGenerator("15:00.0")
    # parser = PCIeRegisterParser(data_generator)
    # for reg_struct in parser.cxl_structures:
    #     print(reg_struct.name)
    #     for reg in reg_struct.registers:
    #         print(reg)
            
            
            