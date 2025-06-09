
import sys
import os
from thefuzz import fuzz
from thefuzz import process

# add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from pci import build_pci_structures_from_json
from pcie import build_pcie_structures_from_json
from extend import build_pcie_extended_structures_from_json



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
    
    def get_bar_space(self, size: int):
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
        self.all_structures = self.build_all_structures(config_space)

        for reg_struct in self.all_structures:
            for reg in reg_struct.registers:
                self.all_structures_map[reg.name] = reg
                for field in reg.fields:
                    if field.name not in self.all_structures_map:
                        self.all_structures_map[field.name] = field
                    else:
                        self.all_structures_map[field.name + '_field'] = field

    def __getitem__(self, key):
        correct_key, score = process.extractOne(key, self.all_structures_map.keys())
        if score > 80:
            print(f'Use {key}, You mean {correct_key}')
        else:
            print(f'Use {key}, May be you mean {correct_key}')
        return self.all_structures_map[correct_key]
   
  

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
    print(parser['vendor_id Register'])
    # for reg_struct in all_structures:
    #     print(reg_struct.name)
    #     for reg in reg_struct.registers:
    #         for field in reg.fields:
    #             print(field.name, reg[field.name])
        