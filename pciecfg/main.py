
import sys
import os
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


class PCIeDataGenerator(DataGenerator):
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



class PCIeRegisterParser:
    def __init__(self, data_generator: DataGenerator):
        self.data_generator = data_generator
        self.all_structures_map = {}
        
        config_space = data_generator.get_pcie_config_space()
        self.pcie_structures = self.build_all_structures(config_space)
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
        dvsec_cxl_device = self.all_structures_map['dvsec_register_locator']
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
                        bar_space = self.data_generator.get_bar_space(bar_base, 0x1000, 0x1000)
                        return build_cxl_cache_mem_capability_from_json(bar_space)
                    
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



if __name__ == "__main__":
    data_generator = PCIeDataGenerator("00:00.0")
    parser = PCIeRegisterParser(data_generator)
    print(parser[
        'uncorrectable_error_status'
    ])
    # for reg_struct in all_structures:
    #     print(reg_struct.name)
    #     for reg in reg_struct.registers:
    #         for field in reg.fields:
    #             print(field.name, reg[field.name])
        