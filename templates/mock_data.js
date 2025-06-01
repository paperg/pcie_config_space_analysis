// Mock data for register definitions and values
const MOCK_DATA = {
    // Space type definitions
    spaceTypes: [{
            value: 'pci',
            label: 'PCI Configuration Space'
        },
        {
            value: 'pcie',
            label: 'PCIe Configuration Space'
        },
        {
            value: 'pcie_ext',
            label: 'PCIe Extended Space'
        },
        {
            value: 'mem',
            label: 'Memory Space'
        }
    ],

    // Register definitions for each space type
    registers: {
        pci: [{
                value: 'DEVICE_ID',
                label: 'Device ID Register (0x0000)',
                offset: '0x0000',
                bitRanges: {
                    '31-16': {
                        field: 'Device ID',
                        default: 0x1234,
                        description: 'Device identification number',
                        attributes: ['RO']
                    },
                    '15-0': {
                        field: 'Vendor ID',
                        default: 0x5678,
                        description: 'Vendor identification number',
                        attributes: ['RO']
                    }
                }
            },
            {
                value: 'COMMAND',
                label: 'Command Register (0x0004)',
                offset: '0x0004',
                bitRanges: {
                    '15-15': {
                        field: 'SERR',
                        default: 0,
                        description: 'System Error Enable',
                        attributes: ['RW']
                    },
                    '10-10': {
                        field: 'INTX',
                        default: 0,
                        description: 'INTx Interrupt Disable',
                        attributes: ['RW']
                    },
                    '2-2': {
                        field: 'Bus Master',
                        default: 0,
                        description: 'Bus Master Enable',
                        attributes: ['RW']
                    },
                    '0-0': {
                        field: 'IO Space',
                        default: 0,
                        description: 'IO Space Enable',
                        attributes: ['RW']
                    }
                }
            },
            {
                value: 'STATUS',
                label: 'Status Register (0x0006)',
                offset: '0x0006',
                bitRanges: {
                    '19-19': {
                        field: 'Cap List',
                        default: 1,
                        description: 'Capabilities List',
                        attributes: ['RO']
                    },
                    '15-15': {
                        field: 'SERR',
                        default: 0,
                        description: 'System Error Status',
                        attributes: ['RW1C']
                    },
                    '14-14': {
                        field: 'DEVSEL',
                        default: 0,
                        description: 'Device Select Timing',
                        attributes: ['RO']
                    },
                    '8-8': {
                        field: 'Master Data Parity Error',
                        default: 0,
                        description: 'Master Data Parity Error',
                        attributes: ['RW1C']
                    },
                    '3-3': {
                        field: 'INTx Status',
                        default: 0,
                        description: 'INTx Status',
                        attributes: ['RO']
                    }
                }
            }
        ],
        pcie: [{
                value: 'PCIE_CAP',
                label: 'PCIe Capability Register (0x0100)',
                offset: '0x0100',
                bitRanges: {
                    '31-16': {
                        field: 'Device Capabilities',
                        default: 0x0000,
                        description: 'Device Capabilities Register',
                        attributes: ['RO']
                    },
                    '15-0': {
                        field: 'Device Control',
                        default: 0x0000,
                        description: 'Device Control Register',
                        attributes: ['RW']
                    }
                }
            },
            {
                value: 'DEVICE_CAP',
                label: 'Device Capability Register (0x0104)',
                offset: '0x0104',
                bitRanges: {
                    '31-24': {
                        field: 'Max Payload Size',
                        default: 0x02,
                        description: 'Maximum Payload Size Supported',
                        attributes: ['RO']
                    },
                    '23-16': {
                        field: 'Max Read Request Size',
                        default: 0x02,
                        description: 'Maximum Read Request Size',
                        attributes: ['RO']
                    }
                }
            }
        ],
        pcie_ext: [{
                value: 'EXT_CAP',
                label: 'Extended Capability Register (0x1000)',
                offset: '0x1000',
                bitRanges: {
                    '31-20': {
                        field: 'Capability ID',
                        default: 0x001,
                        description: 'Extended Capability ID',
                        attributes: ['RO']
                    },
                    '19-16': {
                        field: 'Version',
                        default: 0x1,
                        description: 'Capability Version',
                        attributes: ['RO']
                    },
                    '15-0': {
                        field: 'Next Capability Pointer',
                        default: 0x000,
                        description: 'Next Capability Pointer',
                        attributes: ['RO']
                    }
                }
            },
            {
                value: 'EXT_CTRL',
                label: 'Extended Control Register (0x1004)',
                offset: '0x1004',
                bitRanges: {
                    '31-31': {
                        field: 'Enable',
                        default: 0,
                        description: 'Extended Capability Enable',
                        attributes: ['RW']
                    },
                    '30-30': {
                        field: 'Status',
                        default: 0,
                        description: 'Extended Capability Status',
                        attributes: ['RO']
                    }
                }
            }
        ],
        mem: [{
                value: 'MEM_CTRL',
                label: 'Memory Control Register (0x2000)',
                offset: '0x2000',
                bitRanges: {
                    '31-31': {
                        field: 'Enable',
                        default: 0,
                        description: 'Memory Controller Enable',
                        attributes: ['RW']
                    },
                    '30-30': {
                        field: 'Reset',
                        default: 0,
                        description: 'Memory Controller Reset',
                        attributes: ['RW']
                    },
                    '29-24': {
                        field: 'Timeout',
                        default: 0x20,
                        description: 'Memory Access Timeout',
                        attributes: ['RW']
                    }
                }
            },
            {
                value: 'MEM_STATUS',
                label: 'Memory Status Register (0x2004)',
                offset: '0x2004',
                bitRanges: {
                    '31-31': {
                        field: 'Ready',
                        default: 0,
                        description: 'Memory Controller Ready',
                        attributes: ['RO']
                    },
                    '30-30': {
                        field: 'Error',
                        default: 0,
                        description: 'Memory Controller Error',
                        attributes: ['RW1C']
                    },
                    '29-24': {
                        field: 'Error Code',
                        default: 0x00,
                        description: 'Memory Error Code',
                        attributes: ['RO']
                    }
                }
            }
        ]
    },

    // Default register values
    defaultValues: {
        'DEVICE_ID': 0x12345678,
        'COMMAND': 0x00000000,
        'STATUS': 0x00080000,
        'PCIE_CAP': 0x00000000,
        'DEVICE_CAP': 0x02020000,
        'EXT_CAP': 0x00010000,
        'EXT_CTRL': 0x00000000,
        'MEM_CTRL': 0x20000000,
        'MEM_STATUS': 0x00000000
    }
};

// Export the mock data
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MOCK_DATA;
} else {
    window.MOCK_DATA = MOCK_DATA;
}