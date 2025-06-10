


from typing import List
import json
from pciecfg.common import CapabilityStructure
from pciecfg.common import Register


from typing import List

def build_pcie_structures_from_json(config_space: bytes, filename: str = 'pciecfg/reg_json/pcie_reg_6_2.json') -> List[CapabilityStructure]:
    import json

    with open(filename, 'r', encoding='utf-8') as f:
        json_data = json.load(f)

    structure_defs = json_data.get("structure", {})
    register_defs = json_data.get("register", {})
    structures = []
    visited_offsets = set()

    offset = config_space[0x34] 

    while offset != 0 and offset < 0xff and offset not in visited_offsets:
        visited_offsets.add(offset)

        if offset + 2 > 0xff:
            break

        cap_id = config_space[offset]
        next_ptr = config_space[offset + 1]

        # 找结构定义，结构里的cap_id字段匹配
        struct_name = None
        for name, struct_info in structure_defs.items():
            if struct_info['info'].get("cap_id") == cap_id:
                struct_name = name
                break

        if struct_name is None:
            # connot find structure definition, read 16 bytes as default
            size = 16
            raw = config_space[offset:offset+size]
            cap_struct = CapabilityStructure(
                name=f"UnknownStructure_{cap_id}",
                cap_id=cap_id,
                offset=offset,
                size=size,
                raw=raw,
            )
        else:
            struct_info = structure_defs[struct_name]
            info = struct_info.get("info", {})
            size = info.get("size", 16)
            raw = config_space[offset:offset+size]

            cap_struct = CapabilityStructure(
                name=struct_name,
                cap_id=cap_id,
                offset=offset,
                size=size,
                raw=raw,
            )

            # 结构里包含多个寄存器，加载寄存器
            for reg_name in struct_info.get("registers", []):
                if reg_name not in register_defs:
                    raise ValueError(f"Register definition not found: {reg_name}")

                reg_json = register_defs[reg_name]

                reg = Register(
                    reg_type='pcie',
                    reg_name=reg_name,
                    reg_json=reg_json,
                    config_space=raw,
                )
                cap_struct.add_register(reg)

        cap_struct.finalize_raw_data()
        structures.append(cap_struct)

        if next_ptr == 0 or next_ptr in visited_offsets:
            break
        offset = next_ptr

    return structures


if __name__ == "__main__":
    with open("pciecfg/mock_data/config_space.bin", "rb") as f:
        config_space = bytearray(f.read())
        structures = build_pcie_structures_from_json(config_space)
        print(structures)
