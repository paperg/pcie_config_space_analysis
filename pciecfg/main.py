import sys
import os
# add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from pci import build_pci_structures_from_json
from pcie import build_pcie_structures_from_json
from extend import build_pcie_extended_structures_from_json


def build_all_structures(config_space: bytes):
    all_structures = []
    structures = build_pci_structures_from_json(config_space)
    all_structures.extend(structures)
    structures = build_pcie_structures_from_json(config_space)
    all_structures.extend(structures)
    structures = build_pcie_extended_structures_from_json(config_space)
    all_structures.extend(structures)

    return all_structures



if __name__ == "__main__":
    with open("pciecfg/mock_data/config_space.bin", "rb") as f:
        config_space = bytearray(f.read())
        all_structures = build_all_structures(config_space)
        for reg_struct in all_structures:
            print(reg_struct.name)
            for reg in reg_struct.registers:
                for field in reg.fields:
                    print(field.name, reg[field.name])
            