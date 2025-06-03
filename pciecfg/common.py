
from dataclasses import dataclass, field
from typing import Optional, List, Union
from typing import Dict
@dataclass
class Field:
    name: str
    bit_offset: int
    bit_width: int
    description: str
    attributes: str

    def mask(self) -> int:
        """生成该字段的掩码（未移动）"""
        return (1 << self.bit_width) - 1

    def extract(self, value: int) -> int:
        """从一个完整的寄存器值中提取该字段的值"""
        return (value >> self.bit_offset) & self.mask()

    def bit_range(self) -> str:
        """返回类似 [7:0] 的位范围字符串"""
        end = self.bit_offset + self.bit_width - 1
        return f"[{end}:{self.bit_offset}]"

@dataclass
class Register:
    name: str = ""
    offset: int = None
    size: int = None
    type: str = "pci"  # 'pci' | 'pcie' | 'extended' | 'CXL'
    fields: List[Field] = None
    raw: bytes = None
    _value: int = 0

    def __init__(self, reg_type, reg_name, reg_json: Dict, config_space: bytes):
        """
        reg_json 是单个寄存器的 json 描述字典，格式类似：
        {
            "name": "command",
            "offset": 4,
            "size": 2,
            "type": "pci",
            "fields": [ {...}, {...}, ... ]
        }
        config_space 是整个配置空间的 bytes
        """
        self.name = reg_name
        self.offset = reg_json.get("offset")
        self.size = reg_json.get("size")
        self.type = reg_type

        # 解析字段
        self.fields = []
        for f in reg_json.get("fields", []):
            field = Field(
                name=f["name"],
                bit_offset=f["bit"],
                bit_width=f["bit_width"],
                description=f["description"],
                attributes=f["attributes"]
            )
            self.fields.append(field)

        # 从配置空间切片取值
        if self.offset is not None and self.size is not None:
            self.raw = config_space[self.offset:self.offset + self.size]
            self._value = int.from_bytes(self.raw, byteorder='little')
        else:
            self.raw = b""
            self._value = 0

    def __getitem__(self, key):
        if isinstance(key, str):
            for field in self.fields:
                if field.name == key:
                    value = field.extract(self._value)
                    return f"0x{value:X}"  # 返回十六进制表示

            raise KeyError(f"Field '{key}' not found")
        elif isinstance(key, int):
            for field in self.fields:
                if field.bit_offset <= key < field.bit_offset + field.bit_width:
                    value = field.extract(self._value)
                    return f"0x{value:X}"  # 返回十六进制表示
            raise KeyError(f"No field contains bit {key}")
        else:
            raise TypeError("Key must be a string (field name) or int (bit offset)")

    def debug(self) -> str:
        lines = []

        lines.append(f"{self.name.capitalize()} Register:")

        # 将寄存器值分为 16 字节一组，按行显示
        for i in range(0, self.size, 16):  # 每次处理 16 字节 
            # 提取 16 字节
            byte_chunk = self.raw[i:i + 16]

            # 格式化为十六进制，每个字节用 2 个字符显示
            hex_values = ' '.join(f"{byte:02X}" for byte in byte_chunk)

            # 添加偏移值，并将其格式化为 3 位宽的十六进制
            offset_hex = f"{self.offset + i:03X}"

            # 拼接偏移和十六进制字节值
            lines.append(f"[{offset_hex}]: {hex_values}")

        # 解析字段
        for field in self.fields:
            value = field.extract(self._value)
            value_hex = f"0x{value:X}"  # 以十六进制格式显示字段值
            lines.append(
                f"    bit{field.bit_range().rjust(9)} {field.name.ljust(30)} = {value_hex}"
            )

        return "\n".join(lines)

    def __repr__(self):
        return self.debug()
    
    
@dataclass
class CapabilityStructure:
    name: str
    cap_id: Optional[int]  # None 表示共用 pci-compatible
    offset: int
    size: Optional[int] = None    # size 可以不传
    raw: Optional[bytes] = None   # raw 可以不传
    registers: List[Register] = field(default_factory=list)

    def add_register(self, register: Register):
        self.registers.append(register)

    def get_register_by_name(self, name: str) -> Optional[Register]:
        return next((r for r in self.registers if r.name == name), None)

    def get_register_by_offset(self, offset: int) -> Optional[Register]:
        return next((r for r in self.registers if r.offset == offset), None)

    def get_field_value(self, register_name: str, field_name: str):
        reg = self.get_register_by_name(register_name)
        return reg.get_field_value(field_name) if reg else None

    def finalize_raw_data(self):
        if not self.registers:
            return
        last = max(r.offset + r.size for r in self.registers)
        self.raw = self.raw[:last]
        self.size = len(self.raw)

    def __getitem__(self, key: Union[str, int, tuple]):
        if isinstance(key, str):
            return self.get_register_by_name(key)
        elif isinstance(key, tuple) and len(key) == 2:
            return self.get_field_value(*key)
        elif isinstance(key, int):
            return self.get_register_by_offset(key)
        raise KeyError(f"Invalid key: {key}")

    def __repr__(self):
        indent = "  "
        lines = [
            f"<CapabilityStructure: name='{self.name}', cap_id={self.cap_id}, offset=0x{self.offset:02X}>",
            f"{indent}Raw Data (16 bytes per line):"
        ]
        for i in range(0, len(self.raw), 16):
            chunk = self.raw[i:i + 16]
            hex_str = ' '.join(f"{b:02X}" for b in chunk)
            lines.append(f"{indent}{i:03X}: {hex_str}")

        if self.registers:
            for reg in self.registers:
                lines.append(reg.debug())

        return "\n".join(lines)