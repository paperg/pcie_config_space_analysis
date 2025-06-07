document.addEventListener('DOMContentLoaded', () => {
    const dataContainer = document.getElementById('data-container');
    const loadingIndicator = document.getElementById('loading');
    const regions = document.querySelectorAll('.region');
    const registerMap = document.getElementById('register-map');
    const registerCount = document.getElementById('register-count');
    const deviceSearch = document.getElementById('deviceSearch');
    const deviceDropdown = document.getElementById('deviceDropdown');

    // Theme toggle functionality (similar to index.js)
    const themeToggle = $('#themeToggle');

    // Responsive font size adjustment
    function setFontSize() {
        const whei = $(window).width();
        $("html").css({
            fontSize: whei / 20
        });
    }

    // Initialize font size
    setFontSize();

    // Handle window resize
    $(window).resize(function () {
        setFontSize();
    });

    // Check theme setting in local storage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        $('body').addClass('dark-theme');
    }

    // Theme toggle button click event
    themeToggle.on('click', function () {
        const body = $('body');
        if (body.hasClass('dark-theme')) {
            body.removeClass('dark-theme');
            localStorage.setItem('theme', 'light');
        } else {
            body.addClass('dark-theme');
            localStorage.setItem('theme', 'dark');
        }
    });

    // Current state
    let currentRegion = null;
    let currentRegisterData = {};
    let pcieDevices = [];
    let selectedDevice = null;
    let registerBlocks = [];
    let selectedRegisterBlock = null;

    // Load PCIe devices from lspci.txt
    async function loadPCIeDevices() {
        try {
            const response = await fetch('/pciecfg/mock_data/lspci.txt');
            if (response.ok) {
                const text = await response.text();
                const lines = text.trim().split('\n');
                pcieDevices = lines.map(line => {
                    const match = line.match(/^([0-9a-f]{2}:[0-9a-f]{2}\.[0-9a-f])\s+(.+)$/i);
                    if (match) {
                        return {
                            bdf: match[1],
                            description: match[2].trim()
                        };
                    }
                    return null;
                }).filter(device => device !== null);
            }
        } catch (error) {
            console.error('Error loading PCIe devices:', error);
            // Fallback to sample devices
            pcieDevices = [{
                    bdf: '00:00.0',
                    description: 'Host bridge: Intel Corporation Ice Lake Host Bridge'
                },
                {
                    bdf: '01:00.0',
                    description: 'Co-processor: Intel Corporation 4xxx Series QAT'
                },
                {
                    bdf: '2a:00.0',
                    description: 'Ethernet controller: Intel Corporation I210 Gigabit Network Connection'
                }
            ];
        }
        populateDeviceDropdown();
    }

    // Populate device dropdown
    function populateDeviceDropdown() {
        deviceDropdown.innerHTML = '';
        pcieDevices.forEach(device => {
            const option = document.createElement('div');
            option.className = 'device-option';
            option.dataset.bdf = device.bdf;
            option.innerHTML = `<span class="device-bdf">${device.bdf}</span> <span class="device-desc">${device.description}</span>`;
            option.addEventListener('click', () => selectDevice(device));
            deviceDropdown.appendChild(option);
        });
    }

    // Filter devices based on search
    function filterDevices(searchTerm) {
        const filteredDevices = pcieDevices.filter(device =>
            device.bdf.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

        deviceDropdown.innerHTML = '';
        filteredDevices.forEach(device => {
            const option = document.createElement('div');
            option.className = 'device-option';
            option.dataset.bdf = device.bdf;
            option.innerHTML = `<span class="device-bdf">${device.bdf}</span> <span class="device-desc">${device.description}</span>`;
            option.addEventListener('click', () => selectDevice(device));
            deviceDropdown.appendChild(option);
        });
    }

    // Select device
    function selectDevice(device) {
        selectedDevice = device;
        deviceSearch.value = `${device.bdf} - ${device.description}`;
        deviceDropdown.classList.remove('show');

        // Update device info display
        document.getElementById('device-name-value').textContent = device.description;
        document.getElementById('device-bdf-value').textContent = device.bdf;

        // Load device config space
        loadDeviceConfigSpace(device.bdf);
    }

    // Device search event listeners
    deviceSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        if (searchTerm.length > 0) {
            filterDevices(searchTerm);
            deviceDropdown.classList.add('show');
        } else {
            populateDeviceDropdown();
            deviceDropdown.classList.add('show');
        }
    });

    deviceSearch.addEventListener('focus', () => {
        deviceDropdown.classList.add('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.device-search-container')) {
            deviceDropdown.classList.remove('show');
        }
    });



    // 格式化地址为4位十六进制 (改为2字节显示)
    const formatAddress = (address) => {
        return address.toString(16).padStart(4, '0').toUpperCase();
    };

    // 格式化字节为2位十六进制
    const formatByte = (byte) => {
        return byte.toString(16).padStart(2, '0').toUpperCase();
    };

    // 创建数据行
    const createDataRow = (address, bytes, highlightOffsets = []) => {
        const row = document.createElement('div');
        row.className = 'data-row';

        const addressSpan = document.createElement('span');
        addressSpan.className = 'address';
        addressSpan.textContent = `${formatAddress(address)}:`;

        const bytesDiv = document.createElement('div');
        bytesDiv.className = 'bytes';

        bytes.forEach((byte, index) => {
            const byteSpan = document.createElement('span');
            byteSpan.className = 'byte';

            const byteOffset = address + index;

            // Check if this byte should be highlighted
            if (highlightOffsets.includes(byteOffset)) {
                byteSpan.classList.add('highlighted');
            }

            // Add register block coloring
            const blockInfo = getRegisterBlockInfo(byteOffset);
            if (blockInfo) {
                byteSpan.classList.add('register-block', `block-${blockInfo.colorIndex}`);
                byteSpan.dataset.blockId = blockInfo.id;
                byteSpan.dataset.blockName = blockInfo.name;

                // Add hover event for register block
                byteSpan.addEventListener('mouseenter', () => {
                    highlightRegisterBlock(blockInfo.id);
                });

                byteSpan.addEventListener('mouseleave', () => {
                    clearRegisterBlockHighlight();
                });

                // Add click event to select register block
                byteSpan.addEventListener('click', () => {
                    selectRegisterBlock(blockInfo);
                });
            }



            byteSpan.textContent = formatByte(byte);
            bytesDiv.appendChild(byteSpan);
        });

        row.appendChild(addressSpan);
        row.appendChild(bytesDiv);
        return row;
    };

    // 显示内存数据
    const displayMemoryData = (data, highlightOffsets = []) => {
        dataContainer.innerHTML = '';
        for (let i = 0; i < data.length; i += 16) {
            const rowData = data.slice(i, i + 16);
            const row = createDataRow(i, rowData, highlightOffsets);
            dataContainer.appendChild(row);
        }
    };

    // Get register block info for a given offset
    const getRegisterBlockInfo = (offset) => {
        for (let i = 0; i < registerBlocks.length; i++) {
            const block = registerBlocks[i];
            if (offset >= block.offset && offset < (block.offset + block.size)) {
                return {
                    ...block,
                    id: i,
                    colorIndex: i % 8 // Cycle through 8 colors
                };
            }
        }
        return null;
    };

    // Highlight register block
    const highlightRegisterBlock = (blockId) => {
        // Clear previous highlights
        document.querySelectorAll('.byte.block-highlight').forEach(el => {
            el.classList.remove('block-highlight');
        });

        // Highlight current block
        document.querySelectorAll(`.byte[data-block-id="${blockId}"]`).forEach(el => {
            el.classList.add('block-highlight');
        });
    };

    // Clear register block highlight
    const clearRegisterBlockHighlight = () => {
        document.querySelectorAll('.byte.block-highlight').forEach(el => {
            el.classList.remove('block-highlight');
        });
    };

    // Select register block and show its details in right panel
    const selectRegisterBlock = (blockInfo) => {
        selectedRegisterBlock = blockInfo;
        generateRegisterMap(currentRegisterData[currentRegion] || [], blockInfo);
        registerCount.textContent = `${blockInfo.name} - ${blockInfo.registers.length} registers`;

        // Highlight the selected block
        highlightRegisterBlock(blockInfo.id);
    };



    // Load device config space
    const loadDeviceConfigSpace = (bdf) => {
        // Simulate PCIe config space region click
        const pcieRegion = document.querySelector('[data-region="pcie"]');
        if (pcieRegion) {
            pcieRegion.click();
        }
    };

    // 生成 PCIe 规范样式的寄存器分布图
    const generateRegisterMap = (currentData = [], selectedBlock = null) => {
        registerMap.innerHTML = '';

        // If a specific block is selected, only show that block's registers
        if (selectedBlock && selectedBlock.registers) {
            generateSelectedBlockLayout(currentData, selectedBlock);
            return;
        }

        // Define PCIe register layout (first 64 bytes - standard header)
        const pcieLayout = [
            // Row 1: 0x00-0x03
            {
                offset: 0x00,
                fields: [{
                        name: 'Vendor ID',
                        bits: 16,
                        type: 'header'
                    },
                    {
                        name: 'Device ID',
                        bits: 16,
                        type: 'header'
                    }
                ]
            },
            // Row 2: 0x04-0x07
            {
                offset: 0x04,
                fields: [{
                        name: 'Command',
                        bits: 16,
                        type: 'control'
                    },
                    {
                        name: 'Status',
                        bits: 16,
                        type: 'control'
                    }
                ]
            },
            // Row 3: 0x08-0x0B
            {
                offset: 0x08,
                fields: [{
                        name: 'Revision ID',
                        bits: 8,
                        type: 'header'
                    },
                    {
                        name: 'Class Code',
                        bits: 24,
                        type: 'header'
                    }
                ]
            },
            // Row 4: 0x0C-0x0F
            {
                offset: 0x0C,
                fields: [{
                        name: 'Cache Line Size',
                        bits: 8,
                        type: 'control'
                    },
                    {
                        name: 'Latency Timer',
                        bits: 8,
                        type: 'control'
                    },
                    {
                        name: 'Header Type',
                        bits: 8,
                        type: 'header'
                    },
                    {
                        name: 'BIST',
                        bits: 8,
                        type: 'control'
                    }
                ]
            },
            // Row 5: 0x10-0x13 (BAR0)
            {
                offset: 0x10,
                fields: [{
                    name: 'Base Address Register 0',
                    bits: 32,
                    type: 'bar'
                }]
            },
            // Row 6: 0x14-0x17 (BAR1)
            {
                offset: 0x14,
                fields: [{
                    name: 'Base Address Register 1',
                    bits: 32,
                    type: 'bar'
                }]
            },
            // Row 7: 0x18-0x1B (BAR2)
            {
                offset: 0x18,
                fields: [{
                    name: 'Base Address Register 2',
                    bits: 32,
                    type: 'bar'
                }]
            },
            // Row 8: 0x1C-0x1F (BAR3)
            {
                offset: 0x1C,
                fields: [{
                    name: 'Base Address Register 3',
                    bits: 32,
                    type: 'bar'
                }]
            },
            // Row 9: 0x20-0x23 (BAR4)
            {
                offset: 0x20,
                fields: [{
                    name: 'Base Address Register 4',
                    bits: 32,
                    type: 'bar'
                }]
            },
            // Row 10: 0x24-0x27 (BAR5)
            {
                offset: 0x24,
                fields: [{
                    name: 'Base Address Register 5',
                    bits: 32,
                    type: 'bar'
                }]
            },
            // Row 11: 0x28-0x2B
            {
                offset: 0x28,
                fields: [{
                    name: 'Cardbus CIS Pointer',
                    bits: 32,
                    type: 'header'
                }]
            },
            // Row 12: 0x2C-0x2F
            {
                offset: 0x2C,
                fields: [{
                        name: 'Subsystem Vendor ID',
                        bits: 16,
                        type: 'header'
                    },
                    {
                        name: 'Subsystem Device ID',
                        bits: 16,
                        type: 'header'
                    }
                ]
            },
            // Row 13: 0x30-0x33
            {
                offset: 0x30,
                fields: [{
                    name: 'Expansion ROM Base Address',
                    bits: 32,
                    type: 'bar'
                }]
            },
            // Row 14: 0x34-0x37
            {
                offset: 0x34,
                fields: [{
                        name: 'Capabilities Pointer',
                        bits: 8,
                        type: 'capability'
                    },
                    {
                        name: 'Reserved',
                        bits: 24,
                        type: 'reserved'
                    }
                ]
            },
            // Row 15: 0x38-0x3B
            {
                offset: 0x38,
                fields: [{
                    name: 'Reserved',
                    bits: 32,
                    type: 'reserved'
                }]
            },
            // Row 16: 0x3C-0x3F
            {
                offset: 0x3C,
                fields: [{
                        name: 'Interrupt Line',
                        bits: 8,
                        type: 'control'
                    },
                    {
                        name: 'Interrupt Pin',
                        bits: 8,
                        type: 'control'
                    },
                    {
                        name: 'Min_Gnt',
                        bits: 8,
                        type: 'control'
                    },
                    {
                        name: 'Max_Lat',
                        bits: 8,
                        type: 'control'
                    }
                ]
            }
        ];

        // Generate capability space rows (0x40-0xFF)
        for (let offset = 0x40; offset < 0x100; offset += 4) {
            pcieLayout.push({
                offset: offset,
                fields: [{
                    name: `Config Space +${offset.toString(16).toUpperCase()}h`,
                    bits: 32,
                    type: 'capability'
                }]
            });
        }

        // Generate extended config space rows (0x100-0xFFF)
        for (let offset = 0x100; offset < 0x1000; offset += 16) {
            for (let i = 0; i < 4; i++) {
                const rowOffset = offset + (i * 4);
                pcieLayout.push({
                    offset: rowOffset,
                    fields: [{
                        name: `Extended Config +${rowOffset.toString(16).toUpperCase()}h`,
                        bits: 32,
                        type: 'capability'
                    }]
                });
            }
        }

        // Generate rows
        pcieLayout.forEach(row => {
            const rowElement = document.createElement('div');
            rowElement.className = 'register-row';

            // Offset column
            const offsetDiv = document.createElement('div');
            offsetDiv.className = 'register-offset';
            offsetDiv.textContent = `${row.offset.toString(16).padStart(4, '0').toUpperCase()}h`;

            // Fields container
            const fieldsDiv = document.createElement('div');
            fieldsDiv.className = 'register-fields';

            // Calculate field widths based on bits
            const totalBits = row.fields.reduce((sum, field) => sum + field.bits, 0);

            row.fields.forEach(field => {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = `register-field ${field.type}`;
                fieldDiv.style.width = `${(field.bits / 32) * 100}%`;

                // Get field value from data
                let value = 0;
                if (currentData && currentData.length > row.offset) {
                    const bytesToRead = Math.min(4, field.bits / 8);
                    for (let i = 0; i < bytesToRead; i++) {
                        if (row.offset + i < currentData.length) {
                            value |= (currentData[row.offset + i] << (i * 8));
                        }
                    }
                }

                fieldDiv.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 0.02rem;">${field.name}</div>
                    <div style="font-family: 'Courier New', monospace; font-size: 0.08rem;">
                        0x${value.toString(16).padStart(Math.ceil(field.bits / 4), '0').toUpperCase()}
                    </div>
                `;

                // Add click event to highlight in memory view
                fieldDiv.addEventListener('click', () => {
                    const highlightOffsets = [];
                    const bytesToHighlight = Math.ceil(field.bits / 8);
                    for (let i = 0; i < bytesToHighlight; i++) {
                        highlightOffsets.push(row.offset + i);
                    }
                    displayMemoryData(currentData, highlightOffsets);

                    // Scroll to register position in memory view
                    const targetRow = Math.floor(row.offset / 16);
                    const rows = dataContainer.querySelectorAll('.data-row');
                    if (rows[targetRow]) {
                        rows[targetRow].scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }
                });

                fieldsDiv.appendChild(fieldDiv);
            });

            rowElement.appendChild(offsetDiv);
            rowElement.appendChild(fieldsDiv);
            registerMap.appendChild(rowElement);
        });
    };

    // Generate layout for selected register block only
    const generateSelectedBlockLayout = (currentData, selectedBlock) => {
        // Show block header
        const blockHeader = document.createElement('div');
        blockHeader.className = 'selected-block-header';
        blockHeader.innerHTML = `
            <h4>${selectedBlock.name}</h4>
            <p>Offset: 0x${selectedBlock.offset.toString(16).padStart(4, '0').toUpperCase()} - 
               0x${(selectedBlock.offset + selectedBlock.size - 1).toString(16).padStart(4, '0').toUpperCase()}</p>
            <p>${selectedBlock.description || 'No description available'}</p>
        `;
        registerMap.appendChild(blockHeader);

        // Generate rows for this block's registers
        selectedBlock.registers.forEach(register => {
            const rowElement = document.createElement('div');
            rowElement.className = 'register-row';

            // Offset column
            const offsetDiv = document.createElement('div');
            offsetDiv.className = 'register-offset';
            offsetDiv.textContent = `${register.offset.toString(16).padStart(4, '0').toUpperCase()}h`;

            // Register field
            const fieldsDiv = document.createElement('div');
            fieldsDiv.className = 'register-fields';

            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'register-field header'; // Use header color for simplicity
            fieldDiv.style.width = '100%';

            // Get register value from data
            let value = 0;
            if (currentData && currentData.length > register.offset) {
                const bytesToRead = Math.min(4, register.size);
                for (let i = 0; i < bytesToRead; i++) {
                    if (register.offset + i < currentData.length) {
                        value |= (currentData[register.offset + i] << (i * 8));
                    }
                }
            }

            fieldDiv.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 0.02rem;">${register.name}</div>
                <div style="font-family: 'Courier New', monospace; font-size: 0.08rem;">
                    Value: 0x${value.toString(16).padStart(8, '0').toUpperCase()}
                </div>
                <div style="font-size: 0.07rem; color: #666; margin-top: 0.02rem;">
                    ${register.description || 'No description'}
                </div>
            `;

            // Add click event to highlight in memory view
            fieldDiv.addEventListener('click', () => {
                const highlightOffsets = [];
                for (let i = 0; i < register.size; i++) {
                    highlightOffsets.push(register.offset + i);
                }
                displayMemoryData(currentData, highlightOffsets);

                // Scroll to register position in memory view
                const targetRow = Math.floor(register.offset / 16);
                const rows = dataContainer.querySelectorAll('.data-row');
                if (rows[targetRow]) {
                    rows[targetRow].scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            });

            fieldsDiv.appendChild(fieldDiv);
            rowElement.appendChild(offsetDiv);
            rowElement.appendChild(fieldsDiv);
            registerMap.appendChild(rowElement);
        });
    };



    // 处理区域点击事件
    const handleRegionClick = async (region) => {
        try {
            loadingIndicator.style.display = 'flex';
            dataContainer.innerHTML = '';

            // Remove active class from all regions
            regions.forEach(r => r.classList.remove('active'));
            // Add active class to clicked region
            document.querySelector(`[data-region="${region}"]`).classList.add('active');

            currentRegion = region;

            let response;
            let data;

            if (region === 'pcie') {
                // For PCIe config space, try to fetch config_space.bin
                try {
                    response = await fetch('/config_space.bin');
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        data = Array.from(new Uint8Array(arrayBuffer));
                    } else {
                        // Fallback to mock data if file not found
                        data = generateMockPCIeData();
                    }
                } catch (error) {
                    console.log('config_space.bin not found, using mock data');
                    data = generateMockPCIeData();
                }

                // Set up register blocks for PCIe config space
                setupRegisterBlocks();

            } else {
                // For other regions, use API or mock data
                try {
                    response = await fetch(`/api/memory/${region}`);
                    if (response.ok) {
                        data = await response.json();
                    } else {
                        data = generateMockMemoryData(region);
                    }
                } catch (error) {
                    console.error('Error fetching memory data:', error);
                    data = generateMockMemoryData(region);
                }
            }

            // Store current data
            currentRegisterData[region] = data;

            // Display memory data
            displayMemoryData(data);

            // Generate register map for PCIe config space
            if (region === 'pcie') {
                generateRegisterMap(data);
            } else {
                registerMap.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">No register map available for this region</div>';
                registerCount.textContent = 'Not PCIe Config Space';
            }

        } catch (error) {
            console.error('Error fetching memory data:', error);
            dataContainer.innerHTML = `<div class="error" style="text-align: center; color: #ff4444; padding: 20px;">Error loading data: ${error.message}</div>`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    };

    // 生成模拟 PCIe 配置空间数据
    const generateMockPCIeData = () => {
        const data = new Array(4096).fill(0); // 4KB for PCIe config space

        // Vendor ID (0x8086 = Intel)
        data[0] = 0x86;
        data[1] = 0x80;

        // Device ID (0x1234)
        data[2] = 0x34;
        data[3] = 0x12;

        // Command Register (0x0006)
        data[4] = 0x06;
        data[5] = 0x00;

        // Status Register (0x0010)
        data[6] = 0x10;
        data[7] = 0x00;

        // Revision ID
        data[8] = 0x01;

        // Class Code (0x060000 = PCI Bridge)
        data[9] = 0x00;
        data[10] = 0x00;
        data[11] = 0x06;

        // Fill some more realistic values
        for (let i = 12; i < 256; i++) {
            data[i] = Math.floor(Math.random() * 256);
        }

        return data;
    };

    // 生成模拟内存数据
    const generateMockMemoryData = (region) => {
        const size = region === 'membar0' ? 1024 : 4096;
        const data = [];
        for (let i = 0; i < size; i++) {
            data.push(Math.floor(Math.random() * 256));
        }
        return data;
    };

    // Setup register blocks for PCIe config space
    const setupRegisterBlocks = () => {
        registerBlocks = [{
                offset: 0x00,
                size: 0x40,
                name: 'PCIe Configuration Header',
                description: 'Standard PCIe configuration space header containing device identification and control registers',
                registers: [{
                        offset: 0x00,
                        name: 'Vendor ID',
                        size: 2,
                        description: 'Identifies the manufacturer of the device'
                    },
                    {
                        offset: 0x02,
                        name: 'Device ID',
                        size: 2,
                        description: 'Identifies the specific device'
                    },
                    {
                        offset: 0x04,
                        name: 'Command Register',
                        size: 2,
                        description: 'Controls device operation'
                    },
                    {
                        offset: 0x06,
                        name: 'Status Register',
                        size: 2,
                        description: 'Reports device status'
                    },
                    {
                        offset: 0x08,
                        name: 'Revision ID',
                        size: 1,
                        description: 'Device revision number'
                    },
                    {
                        offset: 0x09,
                        name: 'Programming Interface',
                        size: 1,
                        description: 'Programming interface identifier'
                    },
                    {
                        offset: 0x0A,
                        name: 'Sub Class Code',
                        size: 1,
                        description: 'Device sub-class'
                    },
                    {
                        offset: 0x0B,
                        name: 'Base Class Code',
                        size: 1,
                        description: 'Device base class'
                    },
                    {
                        offset: 0x0C,
                        name: 'Cache Line Size',
                        size: 1,
                        description: 'Cache line size'
                    },
                    {
                        offset: 0x0D,
                        name: 'Latency Timer',
                        size: 1,
                        description: 'Latency timer'
                    },
                    {
                        offset: 0x0E,
                        name: 'Header Type',
                        size: 1,
                        description: 'Configuration space layout type'
                    },
                    {
                        offset: 0x0F,
                        name: 'BIST',
                        size: 1,
                        description: 'Built-in self test register'
                    },
                    {
                        offset: 0x10,
                        name: 'Base Address Register 0',
                        size: 4,
                        description: 'Memory or I/O base address'
                    },
                    {
                        offset: 0x14,
                        name: 'Base Address Register 1',
                        size: 4,
                        description: 'Memory or I/O base address'
                    },
                    {
                        offset: 0x18,
                        name: 'Base Address Register 2',
                        size: 4,
                        description: 'Memory or I/O base address'
                    },
                    {
                        offset: 0x1C,
                        name: 'Base Address Register 3',
                        size: 4,
                        description: 'Memory or I/O base address'
                    },
                    {
                        offset: 0x20,
                        name: 'Base Address Register 4',
                        size: 4,
                        description: 'Memory or I/O base address'
                    },
                    {
                        offset: 0x24,
                        name: 'Base Address Register 5',
                        size: 4,
                        description: 'Memory or I/O base address'
                    },
                    {
                        offset: 0x2C,
                        name: 'Subsystem Vendor ID',
                        size: 2,
                        description: 'Subsystem vendor identifier'
                    },
                    {
                        offset: 0x2E,
                        name: 'Subsystem Device ID',
                        size: 2,
                        description: 'Subsystem device identifier'
                    },
                    {
                        offset: 0x30,
                        name: 'Expansion ROM Base Address',
                        size: 4,
                        description: 'Expansion ROM base address'
                    },
                    {
                        offset: 0x34,
                        name: 'Capabilities Pointer',
                        size: 1,
                        description: 'Pointer to capabilities list'
                    },
                    {
                        offset: 0x3C,
                        name: 'Interrupt Line',
                        size: 1,
                        description: 'Interrupt line number'
                    },
                    {
                        offset: 0x3D,
                        name: 'Interrupt Pin',
                        size: 1,
                        description: 'Interrupt pin (INTA#-INTD#)'
                    }
                ]
            },
            {
                offset: 0x40,
                size: 0x40,
                name: 'Power Management Capability',
                description: 'Power management capability structure for controlling device power states',
                registers: [{
                        offset: 0x40,
                        name: 'PM Capability ID',
                        size: 1,
                        description: 'Power Management capability ID (0x01)'
                    },
                    {
                        offset: 0x41,
                        name: 'PM Next Pointer',
                        size: 1,
                        description: 'Pointer to next capability'
                    },
                    {
                        offset: 0x42,
                        name: 'PM Capabilities',
                        size: 2,
                        description: 'Power management capabilities'
                    },
                    {
                        offset: 0x44,
                        name: 'PM Control/Status',
                        size: 2,
                        description: 'Power management control and status'
                    },
                    {
                        offset: 0x46,
                        name: 'PM Bridge Support',
                        size: 1,
                        description: 'Bridge support extensions'
                    },
                    {
                        offset: 0x47,
                        name: 'PM Data',
                        size: 1,
                        description: 'Optional data register'
                    }
                ]
            },
            {
                offset: 0x80,
                size: 0x20,
                name: 'MSI Capability',
                description: 'Message Signaled Interrupts capability for efficient interrupt handling',
                registers: [{
                        offset: 0x80,
                        name: 'MSI Capability ID',
                        size: 1,
                        description: 'MSI capability ID (0x05)'
                    },
                    {
                        offset: 0x81,
                        name: 'MSI Next Pointer',
                        size: 1,
                        description: 'Pointer to next capability'
                    },
                    {
                        offset: 0x82,
                        name: 'MSI Message Control',
                        size: 2,
                        description: 'MSI control register'
                    },
                    {
                        offset: 0x84,
                        name: 'MSI Message Address Low',
                        size: 4,
                        description: 'Lower 32 bits of message address'
                    },
                    {
                        offset: 0x88,
                        name: 'MSI Message Address High',
                        size: 4,
                        description: 'Upper 32 bits of message address'
                    },
                    {
                        offset: 0x8C,
                        name: 'MSI Message Data',
                        size: 2,
                        description: 'Message data pattern'
                    }
                ]
            },
            {
                offset: 0xA0,
                size: 0x3C,
                name: 'PCIe Capability',
                description: 'PCI Express capability structure containing PCIe-specific control and status',
                registers: [{
                        offset: 0xA0,
                        name: 'PCIe Capability ID',
                        size: 1,
                        description: 'PCIe capability ID (0x10)'
                    },
                    {
                        offset: 0xA1,
                        name: 'PCIe Next Pointer',
                        size: 1,
                        description: 'Pointer to next capability'
                    },
                    {
                        offset: 0xA2,
                        name: 'PCIe Capabilities',
                        size: 2,
                        description: 'PCIe capabilities register'
                    },
                    {
                        offset: 0xA4,
                        name: 'PCIe Device Capabilities',
                        size: 4,
                        description: 'PCIe device capabilities'
                    },
                    {
                        offset: 0xA8,
                        name: 'PCIe Device Control',
                        size: 2,
                        description: 'PCIe device control register'
                    },
                    {
                        offset: 0xAA,
                        name: 'PCIe Device Status',
                        size: 2,
                        description: 'PCIe device status register'
                    },
                    {
                        offset: 0xAC,
                        name: 'PCIe Link Capabilities',
                        size: 4,
                        description: 'PCIe link capabilities'
                    },
                    {
                        offset: 0xB0,
                        name: 'PCIe Link Control',
                        size: 2,
                        description: 'PCIe link control register'
                    },
                    {
                        offset: 0xB2,
                        name: 'PCIe Link Status',
                        size: 2,
                        description: 'PCIe link status register'
                    }
                ]
            }
        ];
    };

    // 为每个区域添加点击事件监听器
    regions.forEach(region => {
        region.addEventListener('click', () => {
            const regionType = region.dataset.region;
            handleRegionClick(regionType);
        });
    });

    // Initialize
    loadPCIeDevices().then(() => {
        // Auto-select first device if available
        if (pcieDevices.length > 0) {
            selectDevice(pcieDevices[0]);
        }

        // Auto-click PCIe config space on load
        setTimeout(() => {
            const pcieRegion = document.querySelector('[data-region="pcie"]');
            if (pcieRegion) {
                pcieRegion.click();
            }
        }, 100);
    });
});