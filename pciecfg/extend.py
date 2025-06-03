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

        # 读4字节头部，结构是：  
        # Word0低16位 = cap_id  
        # Word0高8位 = version (低4位) + 下一个偏移 (高4位的一部分)  
        # Word1低8位 = 下一个偏移剩余部分，组成12位偏移指针
        if offset + 4 > 0x1000:
            break

        header = config_space[offset:offset+4]
        if header == b'\x00\x00\x00\x00':
            break

        cap_id = int.from_bytes(header[:2], 'little')
        # next_ptr：header[2]高4位 + header[3]，组成12位指针
        next_ptr = ((header[2] >> 4) | (header[3] << 4))

        # 查找JSON中是否支持该cap_id
        matched_struct = None
        for struct_name, struct_info in structure_data.items():
            info = struct_info.get("info", {})
            if info.get("cap_id") == cap_id:
                matched_struct = (struct_name, struct_info)
                break

        if not matched_struct:
            # 不支持的cap_id，跳过或用通用处理（这里跳过）
            if next_ptr == 0 or next_ptr <= offset:
                break
            offset = next_ptr
            continue

        struct_name, struct_info = matched_struct
        info = struct_info.get("info", {})

        # 计算当前结构大小（如果有下一个偏移，就用下一个偏移减当前偏移，否则用默认大小）
        if next_ptr > offset:
            size = next_ptr - offset
        else:
            size = info.get("size", 0x100)

        # 防止越界
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

        # 添加寄存器
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

        if next_ptr == 0 or next_ptr <= offset:
            break
        offset = next_ptr

    return structures

if __name__ == "__main__":
    with open("pciecfg/config_space.bin", "rb") as f:
        config_space = bytearray(f.read())
        structures = build_pcie_extended_structures_from_json(config_space)
        print(structures)