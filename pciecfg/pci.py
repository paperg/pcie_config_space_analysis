
import json
from typing import List
from common import Register
from common import CapabilityStructure

def build_pci_structures_from_json(config_space: bytes, filename: str = 'pciecfg/reg_json/pci_reg_6_2.json') -> List[CapabilityStructure]:
    with open(filename, 'r', encoding='utf-8') as f:
        json_data = json.load(f)

    structures = []
    structure_data = json_data["structure"]
    reg_type = 'pci'
    
    for struct_name, struct_info in structure_data.items():
        if struct_name == "register":
            continue  # 跳过寄存器定义部分

        info = struct_info.get("info", {})
        offset = info.get("offset", 0)
        size = info.get("size", 1024)

        cap_struct = CapabilityStructure(
            name=struct_name,
            cap_id=None,
            offset=offset,
            size=size,
            raw=config_space[offset:offset+size],
        )

        # 构建所有寄存器
        register_defs = json_data["register"]
        for reg_name in struct_info.get("registers", []):
            if reg_name not in register_defs:
                raise ValueError(f"Register definition not found: {reg_name}")

            reg_json = register_defs[reg_name]

            reg = Register(
                reg_type=reg_type,
                reg_name=reg_name,
                reg_json=reg_json,
                config_space=config_space,
            )
            cap_struct.add_register(reg)

        cap_struct.finalize_raw_data()
        structures.append(cap_struct)

    return structures



with open("pciecfg/config_space.bin", "rb") as f:
    config_space = bytearray(f.read())
    structures = build_pci_structures_from_json(config_space)
    print(structures)
    