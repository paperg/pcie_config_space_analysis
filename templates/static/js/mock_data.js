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
        },
        {
            value: 'config',
            label: 'Configuration Space'
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
                        description: 'Device identification number ask巨大石块ask觉得阿凯打开深刻的阿斯达克奥斯卡打赏的卡士达深刻的ask的卡斯柯打算考虑到ask老大上课大大叔控阿喀琉斯的卡上的卡上打卡快乐看来是宽度爱上了阿达阿斯顿ask的阿克苏达阔大叔控打算打卡数据的咯撒肯定撒的卡萨丁阿克苏达阔打赏 asddskkdakdakdkasj',
                        attributes: ['RO']
                    },
                    '15-0': {
                        field: 'Vendor ID',
                        default: 0x5678,
                        description: 'Vendor identification number sdsd s d ad as \n dassad ad a dasdasdasda sa \n dfds sdf sdf\n',
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
        ],
        'config': [{
            value: 'config_status',
            label: 'Configuration Status Register',
            offset: '0x04',
            bitCount: 32,
            bitRanges: {
                '31-31': {
                    field: 'CAP66',
                    default: 0,
                    description: '66MHz Capable',
                    attributes: ['RO']
                },
                '30-30': {
                    field: 'UDF',
                    default: 0,
                    description: 'User Definable Field',
                    attributes: ['RW']
                },
                '29-29': {
                    field: 'FBB',
                    default: 0,
                    description: 'Fast Back-to-Back Capable',
                    attributes: ['RO']
                },
                '28-28': {
                    field: 'MDPE',
                    default: 0,
                    description: 'Master Data Parity Error',
                    attributes: ['RW1C']
                },
                '27-27': {
                    field: 'DSS',
                    default: 0,
                    description: 'Device Select Speed',
                    attributes: ['RO']
                },
                '26-26': {
                    field: 'SIG',
                    default: 0,
                    description: 'Signaled System Error',
                    attributes: ['RW1C']
                },
                '25-25': {
                    field: 'RMA',
                    default: 0,
                    description: 'Received Master-Abort',
                    attributes: ['RW1C']
                },
                '24-24': {
                    field: 'RTA',
                    default: 0,
                    description: 'Received Target-Abort',
                    attributes: ['RW1C']
                },
                '23-23': {
                    field: 'STA',
                    default: 0,
                    description: 'Signaled Target-Abort',
                    attributes: ['RW1C']
                },
                '22-22': {
                    field: 'DPE',
                    default: 0,
                    description: 'Detected Parity Error',
                    attributes: ['RW1C']
                },
                '21-21': {
                    field: 'DEVSEL',
                    default: 0,
                    description: 'Device Select Timing',
                    attributes: ['RO']
                },
                '20-20': {
                    field: 'MDP',
                    default: 0,
                    description: 'Master Data Parity Error',
                    attributes: ['RW1C']
                },
                '19-19': {
                    field: 'SERR',
                    default: 0,
                    description: 'System Error',
                    attributes: ['RW1C']
                },
                '18-18': {
                    field: 'FAT',
                    default: 0,
                    description: 'Fast Back-to-Back Enable',
                    attributes: ['RW']
                },
                '17-17': {
                    field: 'DPR',
                    default: 0,
                    description: 'Device Reset',
                    attributes: ['RW']
                },
                '16-16': {
                    field: 'INTD',
                    default: 0,
                    description: 'Interrupt Disable',
                    attributes: ['RW']
                },
                '15-15': {
                    field: 'INTC',
                    default: 0,
                    description: 'Interrupt Status',
                    attributes: ['RO']
                },
                '14-14': {
                    field: 'INTB',
                    default: 0,
                    description: 'Interrupt Status',
                    attributes: ['RO']
                },
                '13-13': {
                    field: 'INTA',
                    default: 0,
                    description: 'Interrupt Status',
                    attributes: ['RO']
                },
                '12-12': {
                    field: 'MRL',
                    default: 0,
                    description: 'Memory Request Line',
                    attributes: ['RW']
                },
                '11-11': {
                    field: 'MRLS',
                    default: 0,
                    description: 'Memory Request Line Status',
                    attributes: ['RO']
                },
                '10-10': {
                    field: 'MLR',
                    default: 0,
                    description: 'Memory Line Request',
                    attributes: ['RW']
                },
                '9-9': {
                    field: 'MLRS',
                    default: 0,
                    description: 'Memory Line Request Status',
                    attributes: ['RO']
                },
                '8-8': {
                    field: 'CAP',
                    default: 0,
                    description: 'Capabilities List',
                    attributes: ['RO']
                },
                '7-7': {
                    field: '66MHz',
                    default: 0,
                    description: '66MHz Operation',
                    attributes: ['RO']
                },
                '6-6': {
                    field: 'FAST',
                    default: 0,
                    description: 'Fast Back-to-Back Capable',
                    attributes: ['RO']
                },
                '5-5': {
                    field: 'MED',
                    default: 0,
                    description: 'Medium DEVSEL',
                    attributes: ['RO']
                },
                '4-4': {
                    field: 'SLOW',
                    default: 0,
                    description: 'Slow DEVSEL',
                    attributes: ['RO']
                },
                '3-3': {
                    field: 'MRLS',
                    default: 0,
                    description: 'Memory Request Line Status',
                    attributes: ['RO']
                },
                '2-2': {
                    field: 'MLRS',
                    default: 0,
                    description: 'Memory Line Request Status',
                    attributes: ['RO']
                },
                '1-1': {
                    field: 'CAPS',
                    default: 0,
                    description: 'Capabilities List Status',
                    attributes: ['RO']
                },
                '0-0': {
                    field: 'INT',
                    default: 0,
                    description: 'Interrupt Status',
                    attributes: ['RO']
                }
            }
        }]
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
        'MEM_STATUS': 0x00000000,
        'config_status': 0x00000000
    }
};

// Export the mock data
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MOCK_DATA;
} else {
    window.MOCK_DATA = MOCK_DATA;
}