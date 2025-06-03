# pcie_config_space_analysis

This repository focuses on parsing the contents of the pcie/cxl device configuration space, based on the registers on PCIE spec6.2 and CXL 3.2r.

## language
Python

## target
1. Providing python packages
2. Provides class interface to get the value of the corresponding field based on the register name and offset
2. Provides a web page to display register values and parses bit content according to the protocol.
3. Provide GUI 









## Software design manuscript

```python
class Field:
    # Bit offset of the field in the register
    bit_offset: int

    # Width of the field in bits
    bit_width: int

    # Field description, may contain multiline text
    description: str

    # Access attributes (e.g., RW, RO, VF, ROZ), may span multiple lines
    attributes: str

    def mask(self) -> int:
        """Generate bitmask for the field (not shifted)"""
        return (1 << self.bit_width) - 1

    def extract(self, value: int) -> int:
        """Extract field value from a complete register value"""
        return (value >> self.bit_offset) & self.mask()

    def bit_range(self) -> str:
        """Return bit range string like [7:0]"""
        end = self.bit_offset + self.bit_width - 1
        return f"[{end}:{self.bit_offset}]"

	class Register:
    name: str                # Register name
    offset: int              # Offset relative to the containing structure
    size: int                # Register size in bits
    type: str                # 'pci', 'pcie', 'extended', 'CXL'
    raw: int                 # Raw binary value
    fields: List[Field] = [] # Field list

    def __getitem__(self, key):
        # Access field by name
        ...

    def debug(self) -> str:
        # Return human-readable representation of the register and fields
        ...

    def get_register_by_name(self, name: str):
        # Exact match
        ...

    def get_register_by_fuzzy_name(self, name: str):
        # Fuzzy name match using thefuzz or similar
        ...

    def get_field_value(self, register_name: str, field_name: str):
        # Return specific field value
        ...

    def get_field_value_fuzzy(self, register_name: str, field_name: str):
        # Fuzzy field name search within register
        ...
```

```python
class CapabilityStructure:
    name: str
    cap_id: Optional[int]    # For PCI-compatible, this is None
    offset: int              # Offset in the config space
    raw: bytes               # Raw binary block
    registers: List[Register]

    def get_register_by_name(self, name: str):
        ...

    def get_register_by_offset(self, offset: int):
        ...

    def __getitem__(self, key):
        # Field or register access
        ...

    def __repr__(self):
        ...


class PCIeRegisterFactory:
    def __init__(self, config_space: bytes):
        self.config_space = config_space

    def get_register(self, key):
        # Unified access: key can be name (fuzzy), offset, or type+name
        ...


class PCIeRegisterFactory:
    def __init__(self, config_space: bytes):
        self.config_space = config_space

    def get_register(self, key):
	
	
	def parse_pci_compatible(config_space: bytes):
	def parse_capabilities(config_space: bytes):
	def parse_extended_capabilities(config_space: bytes):

```

```
0 - 3f:
1. PCI-compatible Configuration 寄存器

34 - ff:
2. PCIe capability structure
	cap_id 7:0
	next 15:8

ff - fff:
2. PCIE extebded capability structure
	cap_id 15:0
	next 31:20
	
	1. commond
	2. dvsec	   cap_id = 0x23
		
		dv header vendor id = 0x1e98
	
	
BAR: 
	CXL Component Register
```	

寄存器信息， json 文件：
pci register:

```json
	pci: {
		structure:
		{
			type0_comman_configuration_space: {  # reg_name
				'vendor_id',
				'device_id',
				'command',
				'status',
				...
			}
			
		}
			
		register:
		{
			vendor_id: {
				
			}
			
			command: {
				cap_id: 0,
				offset:0,
				size: 64,
				fileds:{
					{
						bit:0,
						bit_width:1,
						name: 'io_space_enable',
						default: 0,
						value_parse: {
							0: 
							1:
						}
						description: 'sdad\n',
						attributes: 'RW \nVF ROZ',
					},
					{
						bit:1,
						...
					}
				}
			}
			
			....
		}
	}
```

2. pcie capability
	JSON：
	```json
	pcie: {
		structure:
		{
			MSIExtensionCapability: { # name
				depand_on : {
					'MessageUpperAddressRegister': address_64bit_capable,
					'MaskBitsRegister': per_vector_masking_capable,
				},
				'MessageControlRegister',
				'MessageUpperAddressRegister',
				'MessageDataRegister',
				...
			}
			
		}
			
		register:
		{
			MessageControlRegister: {
				cap_id: 0x5,
				offset:0,
				size: 64,
				fileds:{
					{
						bit:0,
						bit_width:1,
						description: 'sdad\n', # support \n
						attributes: 'RW \nVF ROZ',
					},
					{
						bit:1,
						...
					}
				}
			}
			
			....
		}
	}
	```
3. pcie extebded capability
	extend: {
	}
	
4. dvsec 

5. cxl
