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
            $(window).resize(function() {
                setFontSize();
            });

            // Check theme setting in local storage
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                $('body').addClass('dark-theme');
            }

            // Theme toggle button click event
            themeToggle.on('click', function() {
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
            let currentRegisterData = []; // Array for register blocks
            let currentRawData = []; // Array for raw memory data
            let pcieDevices = [];
            let selectedDevice = null;
            let registerBlocks = [];
            let selectedRegisterBlock = null;
            let memoryRegions = [];
            let currentRegionData = null;

            // Load PCIe devices from lspci.txt
            async function loadPCIeDevices() {
                try {
                    const response = await fetch('/api/device');
                    if (response.ok) {
                        const jsonData = await response.json();

                        pcieDevices = jsonData.map(device => ({
                            bdf: device.bdf,
                            description: device.description || device.name || 'Unknown Device'
                        }));
                    }
                } catch (error) {
                    console.error('Error loading PCIe devices:', error);
                    // Fallback to sample devices
                    pcieDevices = [{
                        bdf: '00:00.0',
                        description: 'Host bridge: Intel Corporation Ice Lake Host Bridge'
                    }];
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

            // Device search event listeners with keyboard navigation
            let selectedOptionIndex = -1;
            let currentOptions = [];

            const updateSelectedOption = (newIndex) => {
                // Remove previous selection
                const prevSelected = deviceDropdown.querySelector('.device-option.selected');
                if (prevSelected) {
                    prevSelected.classList.remove('selected');
                }

                // Update index with cyclic bounds checking
                if (currentOptions.length > 0) {
                    // Handle cyclic navigation
                    if (newIndex >= currentOptions.length) {
                        selectedOptionIndex = 0; // Wrap to first option
                    } else if (newIndex < 0) {
                        selectedOptionIndex = currentOptions.length - 1; // Wrap to last option
                    } else {
                        selectedOptionIndex = newIndex;
                    }

                    const selectedOption = currentOptions[selectedOptionIndex];
                    selectedOption.classList.add('selected');

                    // Scroll into view if needed
                    selectedOption.scrollIntoView({
                        block: 'nearest'
                    });
                }
            };

            const refreshCurrentOptions = () => {
                // Clear any previous keyboard selections
                const prevSelected = deviceDropdown.querySelector('.device-option.selected');
                if (prevSelected) {
                    prevSelected.classList.remove('selected');
                }

                currentOptions = Array.from(deviceDropdown.querySelectorAll('.device-option'));
                selectedOptionIndex = -1;

                console.log('Refreshed current options:', currentOptions.length, 'devices available');
            };

            deviceSearch.addEventListener('input', (e) => {
                const searchTerm = e.target.value;
                if (searchTerm.length > 0) {
                    filterDevices(searchTerm);
                    deviceDropdown.classList.add('show');
                } else {
                    populateDeviceDropdown();
                    deviceDropdown.classList.add('show');
                }
                refreshCurrentOptions();
            });

            deviceSearch.addEventListener('keydown', (e) => {
                if (!deviceDropdown.classList.contains('show')) return;

                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        if (currentOptions.length > 0) {
                            // If no option is selected, start from -1 so next will be 0
                            const nextIndex = selectedOptionIndex === -1 ? 0 : selectedOptionIndex + 1;
                            updateSelectedOption(nextIndex);
                        }
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        if (currentOptions.length > 0) {
                            // If no option is selected, start from last option
                            const nextIndex = selectedOptionIndex === -1 ? currentOptions.length - 1 : selectedOptionIndex - 1;
                            updateSelectedOption(nextIndex);
                        }
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (selectedOptionIndex >= 0 && selectedOptionIndex < currentOptions.length) {
                            const selectedOption = currentOptions[selectedOptionIndex];
                            const bdf = selectedOption.dataset.bdf;
                            const device = pcieDevices.find(d => d.bdf === bdf);
                            if (device) {
                                selectDevice(device);
                            }
                        }
                        break;
                    case 'Escape':
                        deviceDropdown.classList.remove('show');
                        selectedOptionIndex = -1;
                        break;
                }
            });

            deviceSearch.addEventListener('focus', () => {
                deviceDropdown.classList.add('show');
                refreshCurrentOptions();
            });

            deviceSearch.addEventListener('blur', () => {
                // Delay hiding to allow clicks on dropdown
                setTimeout(() => {
                    deviceDropdown.classList.remove('show');
                    selectedOptionIndex = -1;
                }, 200);
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.device-search-container')) {
                    deviceDropdown.classList.remove('show');
                    selectedOptionIndex = -1;
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
            async function generateMemoryLayout(regionData) {
                const container = document.getElementById('memory-regions-container');
                if (!container) return;

                container.innerHTML = '';

                try {
                    console.log('Memory region data:', regionData);
                    const memoryRegions = regionData.regions || [];

                    // Create memory regions display (even if no regions from API)
                    if (memoryRegions.length === 0) {
                        return;
                    }

                    // Sort by start address (lowest first, will be reversed by CSS)
                    memoryRegions.sort((a, b) => a.startAddress - b.startAddress);

                    // Calculate total memory span
                    const maxAddress = Math.max(...memoryRegions.map(r => r.startAddress + r.size));
                    const minAddress = Math.min(...memoryRegions.map(r => r.startAddress));
                    const totalSpan = maxAddress - minAddress || 0x1000; // Fallback size
                    console.log('Total span:', totalSpan);
                    console.log('Memory regions:', memoryRegions);

                    const MIN_HEIGHT = 8;
                    const totalAvailableHeight = 100;
                    const minTotal = MIN_HEIGHT * memoryRegions.length;
                    const scalableHeight = Math.max(0, totalAvailableHeight - minTotal);
                    const regionRatios = memoryRegions.map(r => r.size / totalSpan);
                    const totalRatio = regionRatios.reduce((a, b) => a + b, 0);

                    memoryRegions.forEach((region, index) => {
                                const regionDiv = document.createElement('div');
                                regionDiv.className = `memory-region ${region.type === 'reserved' ? 'reserved' : `region-${index % 8}`}`;
                        regionDiv.dataset.region = region.type;

                        const ratio = regionRatios[index] / totalRatio;
                        const dynamicHeight = ratio * scalableHeight;
                        const finalHeight = MIN_HEIGHT + dynamicHeight;

                        // Calculate relative height based on size
                        regionDiv.style.height = `${finalHeight}%`;
                        
                        regionDiv.innerHTML = `
                        <div class="region-label">${region.name}</div>
                        <div class="region-address">0x${region.startAddress.toString(16).padStart(8, '0').toUpperCase()} - 0x${(region.startAddress + region.size).toString(16).padStart(8, '0').toUpperCase()}</div>
                        <div class="region-size">${formatSize(region.size)}</div>
                    `;

                        // Add click event
                        regionDiv.addEventListener('click', () => {
                            handleRegionClick(index);
                        });

                        container.appendChild(regionDiv);
                    });

            // Auto-select the first region (PCIe config space)
            if (memoryRegions.length > 0) {
                setTimeout(() => {
                    const firstRegion = container.querySelector('.memory-region');
                    if (firstRegion) {
                        firstRegion.click();
                    }
                }, 100);
            }

        } catch (error) {
            console.error('Error loading memory regions:', error);
            // Create fallback PCIe region and display mock data
            const regionDiv = document.createElement('div');
            regionDiv.className = 'memory-region region-0';
            regionDiv.dataset.region = 'pcie';
            regionDiv.innerHTML = `
                <div class="region-label">PCIe Config Space</div>
                <div class="region-address">0x00000000</div>
                <div class="region-size">4KB</div>
            `;
            regionDiv.addEventListener('click', () => {
                handleRegionClick('pcie');
            });
            container.appendChild(regionDiv);

            // Display fallback data
            displayMemoryData(generateMockPCIeData());
        }
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
        let currentHoveredBlockId = null;

        bytesDiv.addEventListener('mouseover', (e) => {
            // Find which register block is being hovered
            const target = e.target;
            if (target.classList.contains('byte') && target.dataset.blockId) {
                const blockId = parseInt(target.dataset.blockId);
                const blockInfo = registerBlocks[blockId];

                if (blockInfo && currentHoveredBlockId !== blockId) {
                    currentHoveredBlockId = blockId;
                    highlightRegisterBlock(blockId);
                    // Show register block details in right panel and remember it
                    lastHoveredRegisterBlock = blockInfo;
                    generateRegisterMap(currentRegisterData, blockInfo);
                    registerCount.textContent = `${blockInfo.name} - ${blockInfo.registers.length} registers`;

                    // Show tooltip at mouse position
                    showRegisterBlockTooltip(blockInfo, e);
                }
            }
        });

        bytesDiv.addEventListener('mousemove', (e) => {
            // Update tooltip position if it exists
            if (currentTooltip && e.target.classList.contains('byte') && e.target.dataset.blockId) {
                const left = e.pageX + 10;
                const top = e.pageY + 10;

                const tooltipRect = currentTooltip.getBoundingClientRect();

                if (left + tooltipRect.width <= window.innerWidth && top + tooltipRect.height <= window.innerHeight) {
                    currentTooltip.style.left = `${left}px`;
                    currentTooltip.style.top = `${top}px`;
                }
            }
        });

        bytesDiv.addEventListener('mouseleave', () => {
            currentHoveredBlockId = null;
            clearRegisterBlockHighlight();
            hideRegisterBlockTooltip();
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

    // Tooltip functions for register blocks
    let currentTooltip = null;

    const showRegisterBlockTooltip = (block, mouseEvent) => {
        hideRegisterBlockTooltip(); // Remove existing tooltip

        const tooltip = document.createElement('div');
        tooltip.className = 'register-block-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <strong>${block.name}</strong>
            </div>
            <div class="tooltip-content">
                <div class="tooltip-info">
                    <span><strong>Offset:</strong> 0x${block.offset.toString(16).padStart(3, '0').toUpperCase()}</span>
                    <span><strong>Size:</strong> ${block.size} bytes</span>
                    <span><strong>Registers:</strong> ${block.registers.length}</span>
                </div>
                <div class="tooltip-registers">
                    ${block.registers.map(reg => `
                        <div class="tooltip-register">
                            <div class="tooltip-reg-name">${reg.name}</div>
                            <div class="tooltip-reg-details">
                                <span>OFF: 0x${reg.offset.toString(16).padStart(3, '0').toUpperCase()}</span>
                                <span>SIZE: ${reg.size}B</span>
                                <span>VALUE: 0x${reg.value.toString(16).padStart(reg.size * 2, '0').toUpperCase()}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(tooltip);
        currentTooltip = tooltip;

        // Position tooltip at mouse right-bottom position
        const tooltipRect = tooltip.getBoundingClientRect();

        // Always position to the right-bottom of mouse cursor
        let left = mouseEvent.pageX + 15;
        let top = mouseEvent.pageY + 15;

        // Adjust only if tooltip goes completely off screen
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top + tooltipRect.height > window.innerHeight) {
            top = window.innerHeight - tooltipRect.height - 10;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    };

    const hideRegisterBlockTooltip = () => {
        if (currentTooltip) {
            currentTooltip.remove();
            currentTooltip = null;
        }
    };


    // Load device config space
    const loadDeviceConfigSpace = async (bdf) => {
        console.log('Loading config space for device:', bdf);

        try {
            // Call API to load config space for selected device
            const response = await fetch(`/api/memory/region?bdf=${encodeURIComponent(bdf)}`);
            if (response.ok) {
                const regionData = await response.json();
                currentRegionData = regionData;
                console.log('Loaded config space data for device:', bdf, regionData);

                // Generate memory layout
                generateMemoryLayout(regionData);

                // Update register count display
                const registerCountElement = document.getElementById('register-count');
                if (registerCountElement && regionData.registers_data) {
                    const totalRegisters = regionData.registers_data.reduce((sum, block) => sum + block.registers.length, 0);
                    registerCountElement.textContent = `${regionData.registers_data.length} Blocks, ${totalRegisters} Registers`;
                }
            }
        } catch (error) {
            console.error('Error loading device config space:', error);
        }

        // Auto-select the first memory region
        setTimeout(() => {
            const firstRegion = document.querySelector('.memory-region');
            if (firstRegion) {
                const regionType = firstRegion.dataset.region;
                console.log('Auto-selecting first region:', regionType);
                firstRegion.click();
            }
        }, 100);
    };

    // 生成 PCIe 规范样式的寄存器分布图
    const generateRegisterMap = (currentData = [], selectedBlock = null) => {
        // If a specific block is selected, only show that block's registers
        if (selectedBlock && selectedBlock.registers) {
            generateSelectedBlockLayout(currentData, selectedBlock);
            return;
        }

        // If we have real register data, use it
        if (currentData && Array.isArray(currentData) && currentData.length > 0) {
            console.log('Generating register map with real data:', currentData.length, 'register blocks');
            generateRegisterMapFromRealData(currentData);
            return;
        }

        console.log('Register map No data');
    };

    // Generate layout for selected register block only
    // Generate register map from real backend data - show full 4K layout
    const generateRegisterMapFromRealData = (registerBlocks) => {
        registerMap.innerHTML = '';

        if (!registerBlocks || registerBlocks.length === 0) {
            registerMap.innerHTML = '<div class="no-registers">No register blocks data available</div>';
            return;
        }

        // Create a complete 4K register layout
        generateFull4KLayout(registerBlocks);

        // Update register count
        if (registerCount) {
            const totalRegisters = registerBlocks.reduce((sum, block) => sum + block.registers.length, 0);
            registerCount.textContent = `4KB Config Space - ${registerBlocks.length} Blocks, ${totalRegisters} Registers`;
        }
    };

    // Generate full 4KB layout with all registers
    const generateFull4KLayout = (registerBlocks) => {
        // Create a map of all registers by offset
        const registerMap4K = new Map();

        registerBlocks.forEach((block, blockIndex) => {
            block.registers.forEach(register => {
                registerMap4K.set(register.offset, {
                    ...register,
                    blockIndex: blockIndex,
                    blockName: block.name,
                    blockColor: `block-${blockIndex % 8}`
                });
            });
        });

        // Generate 4KB layout showing only rows with registers and some empty space context
        const processedOffsets = new Set();

        // Sort all register offsets
        const sortedOffsets = Array.from(registerMap4K.keys()).sort((a, b) => a - b);

        // Generate rows for registers and some context around them
        for (const offset of sortedOffsets) {
            const register = registerMap4K.get(offset);

            // Skip if we already processed this offset (for multi-byte registers)
            if (processedOffsets.has(offset)) continue;

            // Calculate row offset (4-byte aligned)
            const rowOffset = Math.floor(offset / 4) * 4;

            // Skip if we already processed this row
            if (processedOffsets.has(rowOffset)) continue;

            const rowElement = document.createElement('div');
            rowElement.className = 'register-row';

            // Offset column
            const offsetDiv = document.createElement('div');
            offsetDiv.className = 'register-offset';
            offsetDiv.textContent = `${rowOffset.toString(16).padStart(4, '0').toUpperCase()}h`;

            // Register fields
            const fieldsDiv = document.createElement('div');
            fieldsDiv.className = 'register-fields';

            // Check for registers in this 4-byte row
            const rowRegisters = [];
            for (let byteOffset = 0; byteOffset < 4; byteOffset++) {
                const absoluteOffset = rowOffset + byteOffset;
                if (registerMap4K.has(absoluteOffset)) {
                    rowRegisters.push(registerMap4K.get(absoluteOffset));
                    processedOffsets.add(absoluteOffset);

                    // Mark next bytes as processed if this is a multi-byte register
                    const reg = registerMap4K.get(absoluteOffset);
                    for (let i = 1; i < reg.size; i++) {
                        processedOffsets.add(absoluteOffset + i);
                    }
                }
            }

            // Mark this row as processed
            processedOffsets.add(rowOffset);

            if (rowRegisters.length > 0) {
                // Sort registers by offset
                rowRegisters.sort((a, b) => a.offset - b.offset);

                let currentPosition = 0; // Track position within the 4-byte row

                rowRegisters.forEach(register => {
                    // Add reserved space if there's a gap
                    const relativeOffset = register.offset - rowOffset;
                    if (relativeOffset > currentPosition) {
                        const gapSize = relativeOffset - currentPosition;
                        const gapDiv = document.createElement('div');
                        gapDiv.className = 'register-field reserved';
                        gapDiv.style.width = `${(gapSize / 4) * 100}%`;
                        gapDiv.innerHTML = `
                            <div class="register-name">Reserved</div>
                            <div class="register-value">--</div>
                        `;
                        fieldsDiv.appendChild(gapDiv);
                        currentPosition = relativeOffset;
                    }

                    const fieldDiv = document.createElement('div');
                    fieldDiv.className = `register-field ${getRegisterType(register)} ${register.blockColor}`;

                    // Calculate width based on register size
                    fieldDiv.style.width = `${(register.size / 4) * 100}%`;

                    // Get register value
                    let value = register.value || 0;
                    if (!register.value && currentRawData && Array.isArray(currentRawData) && currentRawData.length > register.offset) {
                        value = 0;
                        const bytesToRead = register.size;
                        for (let i = 0; i < bytesToRead; i++) {
                            if (register.offset + i < currentRawData.length) {
                                value |= (currentRawData[register.offset + i] << (i * 8));
                            }
                        }
                    }

                    const hexWidth = register.size * 2;
                    const formattedValue = value.toString(16).padStart(hexWidth, '0').toUpperCase();

                    fieldDiv.innerHTML = `
                        <div class="register-name" title="${register.blockName}">${register.name}</div>
                        <div class="register-value">0x${formattedValue}</div>
                        <div class="register-size">${register.size}B</div>
                    `;

                    // Add click event to navigate to register detail page
                    fieldDiv.addEventListener('click', (e) => {
                        // Check if Ctrl key is pressed for opening in new tab
                        const openInNewTab = e.ctrlKey || e.metaKey;

                        // Prepare register data for navigation
                        const registerData = {
                            name: register.name,
                            offset: register.offset,
                            size: register.size,
                            value: value,
                            blockName: register.blockName,
                            blockIndex: register.blockIndex,
                            type: getRegisterType(register),
                            bdf: selectedDevice ? selectedDevice.bdf : null,
                            deviceName: selectedDevice ? selectedDevice.description : null
                        };

                        // Include fields if available
                        if (register.fields && register.fields.length > 0) {
                            registerData.fields = register.fields;
                        }

                        // Create URL with register parameters for backend
                        const params = new URLSearchParams({
                            name: registerData.name
                        });
                        const url = `/index.html?${params.toString()}`;

                        if (openInNewTab) {
                            window.open(url, '_blank');
                        } else {
                            window.location.href = url;
                        }
                    });

                    fieldsDiv.appendChild(fieldDiv);
                    currentPosition += register.size;
                });

                // Fill remaining space if needed
                if (currentPosition < 4) {
                    const remainingSize = 4 - currentPosition;
                    const remainingDiv = document.createElement('div');
                    remainingDiv.className = 'register-field reserved';
                    remainingDiv.style.width = `${(remainingSize / 4) * 100}%`;
                    remainingDiv.innerHTML = `
                        <div class="register-name">Reserved</div>
                        <div class="register-value">--</div>
                    `;
                    fieldsDiv.appendChild(remainingDiv);
                }
            }

            rowElement.appendChild(offsetDiv);
            rowElement.appendChild(fieldsDiv);
            registerMap.appendChild(rowElement);
        }
    };

    const generateSelectedBlockLayout = (allRegisterData, selectedBlock) => {
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

                // Use register value from backend data if available, otherwise calculate from raw data
                let value = register.value || 0;
                if (!register.value && currentRawData && Array.isArray(currentRawData) && currentRawData.length > register.offset) {
                    value = 0;
                    const bytesToRead = register.size;
                    for (let i = 0; i < bytesToRead; i++) {
                        if (register.offset + i < currentRawData.length) {
                            value |= (currentRawData[register.offset + i] << (i * 8));
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

                // Add fields info if available
                if (register.fields && register.fields.length > 0) {
                    const fieldsDiv = document.createElement('div');
                    fieldsDiv.className = 'reg-fields-inline';

                    const fieldSpan = document.createElement('span');
                    fieldSpan.className = 'field-inline';
                    fieldSpan.innerHTML = `${register.name}[${register.offset + register.size - 1}:${register.offset}]`;
                    fieldsDiv.appendChild(fieldSpan);

                    fieldDiv.appendChild(fieldsDiv);
                }

                // Add click event to navigate to register detail page
                fieldDiv.addEventListener('click', (e) => {
                    // Check if Ctrl key is pressed for opening in new tab
                    const openInNewTab = e.ctrlKey || e.metaKey;

                    // Prepare register data for navigation
                    const registerData = {
                        name: register.name,
                        offset: register.offset,
                        size: register.size,
                        value: value,
                        blockName: selectedBlock.name,
                        blockIndex: 0, // Single block view
                        type: getRegisterType(register),
                        bdf: selectedDevice ? selectedDevice.bdf : null,
                        deviceName: selectedDevice ? selectedDevice.description : null
                    };

                    // Include fields if available
                    if (register.fields && register.fields.length > 0) {
                        registerData.fields = register.fields;
                    }

                    // Create URL with register parameters for backend
                    const params = new URLSearchParams({
                        name: registerData.name
                    });
                    const url = `/index.html?${params.toString()}`;

                    if (openInNewTab) {
                        window.open(url, '_blank');
                    } else {
                        window.location.href = url;
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

            if (region === currentRegion) {
                return;
            }

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

            // Store raw config space data
            console.log('currentRegionData', currentRegionData)
            if (currentRegionData['regions'][currentRegion]['raw_data'] && currentRegionData['regions'][currentRegion]['raw_data'].length > 0) {
                currentRawData = currentRegionData['regions'][currentRegion].raw_data;
                console.log('Updated raw config space data:', currentRawData.length, 'bytes');
            }

            // Store register blocks data
            if (currentRegionData['regions'][currentRegion]['registers_data'] && Array.isArray(currentRegionData['regions'][currentRegion]['registers_data'])) {
                currentRegisterData = currentRegionData['regions'][currentRegion]['registers_data'];
                console.log('Updated register blocks data:', currentRegisterData.length, 'register blocks');

                // Update register blocks for highlighting
                setupRegisterBlocksFromData(currentRegisterData);
            }

            // Display the raw data with register block highlighting
            if (currentRawData && currentRawData.length > 0) {
                displayMemoryData(currentRawData);
            }

            // Show register blocks if available
            if (currentRegisterData && currentRegisterData.length > 0) {
                generateRegisterMap(currentRegisterData);
            } else {
                registerMap.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Loading register data...</div>';
                registerCount.textContent = 'PCIe Configuration Space';
            }

        } catch (error) {
            console.error('Error fetching memory data:', error);
            dataContainer.innerHTML = `<div class="error" style="text-align: center; color: #ff4444; padding: 20px;">Error loading data: ${error.message}</div>`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    };

    // Setup register blocks for PCIe config space
    // Setup register blocks from real data
    const setupRegisterBlocksFromData = (registerBlocksData) => {
        registerBlocks = [];
        if (!registerBlocksData || registerBlocksData.length === 0) {
            console.warn('No register blocks data available for highlighting');
            return;
        }

        registerBlocksData.forEach((blockData, index) => {
            registerBlocks.push({
                offset: blockData.offset || 0,
                size: blockData.size || 4,
                name: blockData.name || `Register Block ${index}`,
                description: blockData.description || '',
                registers: blockData.registers || [],
                colorIndex: index % 8 // Cycle through 8 colors
            });
        });

        console.log('Setup register blocks for highlighting:', registerBlocks.length, 'blocks');
    };


    // Initialize
    loadPCIeDevices()
});