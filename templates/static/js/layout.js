document.addEventListener('DOMContentLoaded', () => {
    const dataContainer = document.getElementById('data-container');
    const loadingIndicator = document.getElementById('loading');
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
    let memoryRegions = [];

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

    deviceSearch.addEventListener('blur', () => {
        // Delay hiding to allow clicks on dropdown
        setTimeout(() => {
            deviceDropdown.classList.remove('show');
        }, 200);
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

    // Track the last hovered register block
    let lastHoveredRegisterBlock = null;

    // Generate memory layout
    function generateMemoryLayout() {
        const container = document.getElementById('memory-regions-container');
        if (!container) return;

        container.innerHTML = '';

        // Mock memory regions data (this would come from backend)
        memoryRegions = [{
                name: 'PCIe Config Space',
                startAddress: 0x4000,
                size: 0x1000,
                type: 'pcie',
                description: '4KB PCIe Configuration Space'
            },
            {
                name: 'MEMBAR0',
                startAddress: 0x6000,
                size: 0x2000,
                type: 'membar0',
                description: '1MB Memory BAR 0'
            },
        ];

        // Sort by start address (lowest first, will be reversed by CSS)
        memoryRegions.sort((a, b) => a.startAddress - b.startAddress);

        // Calculate total memory span
        const maxAddress = Math.max(...memoryRegions.map(r => r.startAddress + r.size));
        const minAddress = Math.min(...memoryRegions.map(r => r.startAddress));
        const totalSpan = maxAddress - minAddress;

        memoryRegions.forEach((region, index) => {
            const regionDiv = document.createElement('div');
            regionDiv.className = `memory-region ${region.type === 'reserved' ? 'reserved' : `region-${index % 8}`}`;
            regionDiv.dataset.region = region.type;

            // Calculate relative height based on size
            const relativeHeight = (region.size / totalSpan) * 100;
            regionDiv.style.height = `${Math.max(relativeHeight, 8)}%`; // Minimum 8% height

            regionDiv.innerHTML = `
                <div class="region-label">${region.name}</div>
                <div class="region-address">0x${region.startAddress.toString(16).padStart(8, '0').toUpperCase()}</div>
                <div class="region-size">${formatSize(region.size)}</div>
            `;

            // Add click event
            regionDiv.addEventListener('click', () => {
                handleRegionClick(region.type);
            });

            container.appendChild(regionDiv);
        });
    }

    // Format size helper
    function formatSize(bytes) {
        if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
        } else if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(1)}KB`;
        } else {
            return `${bytes}B`;
        }
    }

    // 创建数据行
    const createDataRow = (address, bytes, highlightOffsets = []) => {
        const row = document.createElement('div');
        row.className = 'data-row';

        const addressSpan = document.createElement('span');
        addressSpan.className = 'address';
        addressSpan.textContent = `${formatAddress(address)}:`;

        const bytesDiv = document.createElement('div');
        bytesDiv.className = 'bytes';

        // Track register blocks in this row
        const blocksInRow = new Set();

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
                blocksInRow.add(blockInfo.id);
            }

            byteSpan.textContent = formatByte(byte);
            bytesDiv.appendChild(byteSpan);
        });

        // Add byte-level hover events for register blocks
        bytesDiv.addEventListener('mouseover', (e) => {
            // Find which register block is being hovered
            const target = e.target;
            if (target.classList.contains('byte') && target.dataset.blockId) {
                const blockId = parseInt(target.dataset.blockId);
                const blockInfo = registerBlocks[blockId];

                if (blockInfo) {
                    highlightRegisterBlock(blockId);
                    // Show register block details in right panel and remember it
                    lastHoveredRegisterBlock = blockInfo;
                    generateRegisterMap(currentRegisterData[currentRegion] || [], blockInfo);
                    registerCount.textContent = `${blockInfo.name} - ${blockInfo.registers.length} registers`;
                }
            }
        });

        bytesDiv.addEventListener('mouseleave', () => {
            clearRegisterBlockHighlight();
            // Don't clear the register layout - keep the last hovered block
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
        // If a specific block is selected, only show that block's registers
        if (selectedBlock && selectedBlock.registers) {
            generateSelectedBlockLayout(currentData, selectedBlock);
            return;
        }

        registerMap.innerHTML = '';

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
        // Clear previous content
        registerMap.innerHTML = '';

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

        // Group registers by 4-byte (32-bit) aligned rows
        const registerRows = groupRegistersByRows(selectedBlock.registers);

        // Generate rows for this block's registers
        registerRows.forEach(row => {
            const rowElement = document.createElement('div');
            rowElement.className = 'register-row';

            // Offset column - use the first register's offset as row offset
            const offsetDiv = document.createElement('div');
            offsetDiv.className = 'register-offset';
            offsetDiv.textContent = `${row.offset.toString(16).padStart(4, '0').toUpperCase()}h`;

            // Register fields
            const fieldsDiv = document.createElement('div');
            fieldsDiv.className = 'register-fields';

            row.registers.forEach(register => {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = `register-field ${getRegisterType(register)}`;

                // Calculate width based on register size (bits)
                const registerBits = register.size * 8;
                fieldDiv.style.width = `${(registerBits / 32) * 100}%`;

                // Get register value from data
                let value = 0;
                if (currentData && currentData.length > register.offset) {
                    const bytesToRead = register.size;
                    for (let i = 0; i < bytesToRead; i++) {
                        if (register.offset + i < currentData.length) {
                            value |= (currentData[register.offset + i] << (i * 8));
                        }
                    }
                }

                // Format value based on register size
                const hexWidth = register.size * 2; // 2 hex chars per byte
                const formattedValue = value.toString(16).padStart(hexWidth, '0').toUpperCase();

                fieldDiv.innerHTML = `
                    <div class="register-name">${register.name}</div>
                    <div class="register-value">0x${formattedValue}</div>
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
            });

            rowElement.appendChild(offsetDiv);
            rowElement.appendChild(fieldsDiv);
            registerMap.appendChild(rowElement);
        });
    };

    // Group registers into 4-byte aligned rows (like PCIe spec)
    function groupRegistersByRows(registers) {
        // Sort registers by offset
        const sortedRegisters = [...registers].sort((a, b) => a.offset - b.offset);
        const rows = [];

        let currentRow = null;
        let currentRowOffset = -1;

        sortedRegisters.forEach(register => {
            const alignedOffset = Math.floor(register.offset / 4) * 4; // 4-byte aligned

            // Start new row if offset changes or current row would exceed 4 bytes
            if (currentRowOffset !== alignedOffset ||
                (currentRow && (currentRow.totalBytes + register.size > 4))) {

                currentRowOffset = alignedOffset;
                currentRow = {
                    offset: alignedOffset,
                    registers: [],
                    totalBytes: 0
                };
                rows.push(currentRow);
            }

            currentRow.registers.push(register);
            currentRow.totalBytes += register.size;
        });

        return rows;
    }

    // Get register type for styling
    function getRegisterType(register) {
        const name = register.name.toLowerCase();
        if (name.includes('vendor') || name.includes('device') || name.includes('class') ||
            name.includes('revision') || name.includes('header') || name.includes('subsystem')) {
            return 'header';
        } else if (name.includes('bar') || name.includes('base address') || name.includes('rom')) {
            return 'bar';
        } else if (name.includes('command') || name.includes('status') || name.includes('control') ||
            name.includes('interrupt') || name.includes('latency') || name.includes('bist')) {
            return 'control';
        } else if (name.includes('capability') || name.includes('cap') || name.includes('pointer')) {
            return 'capability';
        } else {
            return 'header'; // default
        }
    }



    // 处理区域点击事件
    const handleRegionClick = async (region) => {
        try {
            loadingIndicator.style.display = 'flex';
            dataContainer.innerHTML = '';

            // Remove active class from all regions
            document.querySelectorAll('.memory-region').forEach(r => r.classList.remove('active'));
            // Add active class to clicked region
            const targetRegion = document.querySelector(`[data-region="${region}"]`);
            if (targetRegion) {
                targetRegion.classList.add('active');
            }

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

            // Initialize register map display
            if (region === 'pcie') {
                // Show last hovered register block if exists, otherwise show default message
                if (lastHoveredRegisterBlock) {
                    generateRegisterMap(data, lastHoveredRegisterBlock);
                    registerCount.textContent = `${lastHoveredRegisterBlock.name} - ${lastHoveredRegisterBlock.registers.length} registers`;
                } else {
                    registerMap.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Hover over a register block in memory view to see details</div>';
                    registerCount.textContent = 'PCIe Configuration Space';
                }
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
                        name: 'Command',
                        size: 2,
                        description: 'Controls device operation'
                    },
                    {
                        offset: 0x06,
                        name: 'Status',
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
                        name: 'Class Code',
                        size: 3,
                        description: 'Device class, subclass and interface'
                    },
                    {
                        offset: 0x0C,
                        name: 'Cache Line Size',
                        size: 1,
                        description: 'Cache line size in 32-bit words'
                    },
                    {
                        offset: 0x0D,
                        name: 'Latency Timer',
                        size: 1,
                        description: 'Master latency timer'
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
                        description: 'Built-in self test control/status'
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
                        offset: 0x28,
                        name: 'Cardbus CIS Pointer',
                        size: 4,
                        description: 'Pointer to Card Information Structure'
                    },
                    {
                        offset: 0x2C,
                        name: 'Subsystem Vendor ID',
                        size: 2,
                        description: 'Subsystem vendor identifier'
                    },
                    {
                        offset: 0x2E,
                        name: 'Subsystem ID',
                        size: 2,
                        description: 'Subsystem device identifier'
                    },
                    {
                        offset: 0x30,
                        name: 'Expansion ROM Base',
                        size: 4,
                        description: 'Expansion ROM base address'
                    },
                    {
                        offset: 0x34,
                        name: 'Cap Pointer',
                        size: 1,
                        description: 'Capabilities list pointer'
                    },
                    {
                        offset: 0x35,
                        name: 'Reserved',
                        size: 3,
                        description: 'Reserved for future use'
                    },
                    {
                        offset: 0x38,
                        name: 'Reserved',
                        size: 4,
                        description: 'Reserved for future use'
                    },
                    {
                        offset: 0x3C,
                        name: 'Interrupt Line',
                        size: 1,
                        description: 'Interrupt line routing information'
                    },
                    {
                        offset: 0x3D,
                        name: 'Interrupt Pin',
                        size: 1,
                        description: 'Interrupt pin (INTA#-INTD#)'
                    },
                    {
                        offset: 0x3E,
                        name: 'Min Grant',
                        size: 1,
                        description: 'Minimum bus grant time'
                    },
                    {
                        offset: 0x3F,
                        name: 'Max Latency',
                        size: 1,
                        description: 'Maximum latency'
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
                        name: 'Cap ID',
                        size: 1,
                        description: 'Power Management capability ID (0x01)'
                    },
                    {
                        offset: 0x41,
                        name: 'Next Cap',
                        size: 1,
                        description: 'Pointer to next capability'
                    },
                    {
                        offset: 0x42,
                        name: 'PM Capabilities',
                        size: 2,
                        description: 'Power management capabilities register'
                    },
                    {
                        offset: 0x44,
                        name: 'PM Control/Status',
                        size: 2,
                        description: 'Power state control and status'
                    },
                    {
                        offset: 0x46,
                        name: 'PMCSR BSE',
                        size: 1,
                        description: 'Bridge support extensions'
                    },
                    {
                        offset: 0x47,
                        name: 'Data',
                        size: 1,
                        description: 'Power management data register'
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
                        name: 'Cap ID',
                        size: 1,
                        description: 'MSI capability ID (0x05)'
                    },
                    {
                        offset: 0x81,
                        name: 'Next Cap',
                        size: 1,
                        description: 'Pointer to next capability'
                    },
                    {
                        offset: 0x82,
                        name: 'Message Control',
                        size: 2,
                        description: 'MSI enable and configuration'
                    },
                    {
                        offset: 0x84,
                        name: 'Message Address',
                        size: 4,
                        description: 'MSI message target address'
                    },
                    {
                        offset: 0x88,
                        name: 'Message Upper Address',
                        size: 4,
                        description: 'Upper 32 bits (64-bit capable)'
                    },
                    {
                        offset: 0x8C,
                        name: 'Message Data',
                        size: 2,
                        description: 'MSI data payload'
                    },
                    {
                        offset: 0x8E,
                        name: 'Reserved',
                        size: 2,
                        description: 'Reserved for alignment'
                    },
                    {
                        offset: 0x90,
                        name: 'Mask Bits',
                        size: 4,
                        description: 'MSI per-vector mask'
                    },
                    {
                        offset: 0x94,
                        name: 'Pending Bits',
                        size: 4,
                        description: 'MSI pending interrupts'
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
                        name: 'Cap ID',
                        size: 1,
                        description: 'PCIe capability ID (0x10)'
                    },
                    {
                        offset: 0xA1,
                        name: 'Next Cap',
                        size: 1,
                        description: 'Pointer to next capability'
                    },
                    {
                        offset: 0xA2,
                        name: 'PCIe Cap',
                        size: 2,
                        description: 'PCIe capability register'
                    },
                    {
                        offset: 0xA4,
                        name: 'Device Capabilities',
                        size: 4,
                        description: 'PCIe device capabilities'
                    },
                    {
                        offset: 0xA8,
                        name: 'Device Control',
                        size: 2,
                        description: 'Device control register'
                    },
                    {
                        offset: 0xAA,
                        name: 'Device Status',
                        size: 2,
                        description: 'Device status register'
                    },
                    {
                        offset: 0xAC,
                        name: 'Link Capabilities',
                        size: 4,
                        description: 'PCIe link capabilities'
                    },
                    {
                        offset: 0xB0,
                        name: 'Link Control',
                        size: 2,
                        description: 'Link control register'
                    },
                    {
                        offset: 0xB2,
                        name: 'Link Status',
                        size: 2,
                        description: 'Link status register'
                    },
                    {
                        offset: 0xB4,
                        name: 'Slot Capabilities',
                        size: 4,
                        description: 'PCIe slot capabilities'
                    },
                    {
                        offset: 0xB8,
                        name: 'Slot Control',
                        size: 2,
                        description: 'Slot control register'
                    },
                    {
                        offset: 0xBA,
                        name: 'Slot Status',
                        size: 2,
                        description: 'Slot status register'
                    },
                    {
                        offset: 0xBC,
                        name: 'Root Control',
                        size: 2,
                        description: 'Root port control'
                    },
                    {
                        offset: 0xBE,
                        name: 'Root Capabilities',
                        size: 2,
                        description: 'Root port capabilities'
                    }
                ]
            }
        ];
    };



    // Initialize
    loadPCIeDevices().then(() => {
        // Leave device search empty by default
        deviceSearch.value = '';

        // Generate memory layout
        generateMemoryLayout();

        // Auto-click PCIe config space on load
        setTimeout(() => {
            const pcieRegion = document.querySelector('[data-region="pcie"]');
            if (pcieRegion) {
                pcieRegion.click();
            }
        }, 100);
    });
});