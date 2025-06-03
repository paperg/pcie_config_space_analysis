import json
from typing import List
from common import CapabilityStructure
from common import Register


def build_pcie_extended_structures_from_json(
    config_space: bytes,
    filename: str = 'pciecfg/reg_json/extend_reg_6_2.json'
) -> List[CapabilityStructure]:
    with open(filename, 'r', encoding='utf-8') as f:
        json_data = json.load(f)

    structures = []
    structure_data = json_data.get("structure", {})
    register_defs = json_data.get("register", {})
    reg_type = 'pcie_extended'

    offset = 0x100
    visited_offsets = set()

    while offset < 0x1000:
        if offset in visited_offsets:
            # 防止循环链表死循环
            break
        visited_offsets.add(offset)

        if offset + 4 > 0x1000:
            break

        header = config_space[offset:offset+4]
        if header == b'\x00\x00\x00\x00':
            break

        cap_id = int.from_bytes(header[:2], 'little')
        # next_ptr：header[2]高4位 + header[3]，组成12位偏移指针
        next_ptr = ((header[2] >> 4) | (header[3] << 4))

        matched_struct = None
        for struct_name, struct_info in structure_data.items():
            info = struct_info.get("info", {})
            if info.get("cap_id") == cap_id:
                matched_struct = (struct_name, struct_info)
                break

        if matched_struct:
            struct_name, struct_info = matched_struct
            info = struct_info.get("info", {})
            registers = struct_info.get("registers", [])
        else:
            # 不支持的cap_id，构造一个UnknownStructure，寄存器为空
            struct_name = f"UnknownStructure_{cap_id:#x}"
            info = {}
            registers = []

        if next_ptr > offset:
            size = next_ptr - offset
        else:
            size = info.get("size", 0x100)

        if offset + size > len(config_space):
            size = len(config_space) - offset

        raw = config_space[offset:offset + size]

        cap_struct = CapabilityStructure(
            name=struct_name,
            cap_id=cap_id,
            offset=offset,
            size=size,
            raw=raw,
        )

        # 添加寄存器，仅已知结构体有寄存器
        for reg_name in registers:
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

        if next_ptr == 0 or next_ptr <= offset:
            break
        offset = next_ptr

    return structures


if __name__ == "__main__":
    with open("pciecfg/config_space.bin", "rb") as f:
        config_space = bytearray(f.read())
        structures = build_pcie_extended_structures_from_json(config_space)
        for s in structures:
            print(f"{s.name} (cap_id=0x{s.cap_id:x}) @ offset 0x{s.offset:x}, size={s.size}")
            for r in s.registers:
                print(r)