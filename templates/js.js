/****/
$(document).ready(function () {
    // Global variable declarations
    let currentRegisterValue = 0;
    let initialRegisterValue = 0;
    let isValueModified = false;
    let currentBitRanges = {};
    let currentBitCount = 32;
    let currentRegisterInfo = {};

    var whei = $(window).width()
    $("html").css({
        fontSize: whei / 20
    })

    // Theme toggle functionality
    const themeToggle = $('#themeToggle');

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

    // Add debounce function
    function debounce(func, wait) {
        let timeout;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }

    // Handle resize function
    function handleResize() {
        var whei = $(window).width();
        $("html").css({
            fontSize: whei / 20
        });

        // Force reflow
        $('.register').hide().show(0);

        // Recalculate coordinates
        calculateCoordinates();
    }

    // Use debounce for resize event
    const debouncedResize = debounce(handleResize, 100);

    $(window).resize(function () {
        debouncedResize();
    });

    // Calculate coordinates and draw lines
    function calculateCoordinates() {
        const boxes = $('.bit-box');
        const fieldNames = $('.bit-name');
        const svg = $('#svg-line');
        const svgRect = svg[0].getBoundingClientRect();
        const registerRect = $('.register')[0].getBoundingClientRect();

        // Clear previous lines
        svg.empty();

        // Get all bit field ranges
        const fieldRanges = [];
        fieldNames.each(function () {
            const start = parseInt($(this).attr('data-field-start'));
            const end = parseInt($(this).attr('data-field-end'));
            fieldRanges.push({
                start,
                end,
                element: this
            });
        });

        // Create connection lines for each bit field
        fieldRanges.forEach(({
            start,
            end,
            element
        }) => {
            // Get the first and last box of the bit field (note: end is the smaller number, start is the larger number)
            const firstBox = boxes.eq(end); // bit-box 0
            const lastBox = boxes.eq(start); // bit-box 7
            const fieldName = $(element);

            if (firstBox.length && lastBox.length && fieldName.length) {
                // Get box position and size
                const firstBoxRect = firstBox[0].getBoundingClientRect();
                const lastBoxRect = lastBox[0].getBoundingClientRect();
                const nameRect = fieldName[0].getBoundingClientRect();

                // Calculate the starting points of the vertical lines on both sides (midpoints of the box bottom edge)
                const leftX = lastBoxRect.left - registerRect.left + lastBoxRect.width / 2;
                const rightX = firstBoxRect.left - registerRect.left + firstBoxRect.width / 2;
                const startY = firstBoxRect.top - registerRect.top + firstBoxRect.height;

                // Calculate the ending coordinates of the connection line
                const nameX = nameRect.left - registerRect.left;
                const nameY = nameRect.top - registerRect.top + nameRect.height / 2;
                const vLineEndY = startY + 20;

                // Get bit field value (use the value of the highest bit to determine line style)
                const highBitValue = (parseInt($('.register-box').attr('data-value') || '0') >> start) & 1;
                const lineClass = highBitValue ? "line-dashed" : "line";

                // Create left vertical line
                const leftVLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const leftVLineD = `M ${leftX} ${startY} V ${vLineEndY}`;
                leftVLine.setAttribute("d", leftVLineD);
                leftVLine.setAttribute("class", lineClass);
                svg.append(leftVLine);

                // Create right vertical line
                const rightVLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const rightVLineD = `M ${rightX} ${startY} V ${vLineEndY}`;
                rightVLine.setAttribute("d", rightVLineD);
                rightVLine.setAttribute("class", lineClass);
                svg.append(rightVLine);

                // Connect left and right vertical lines
                const hLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const hLineD = `M ${leftX} ${vLineEndY} H ${rightX}`;
                hLine.setAttribute("d", hLineD);
                hLine.setAttribute("class", lineClass);
                svg.append(hLine);

                // Midpoint starting svg draw vertical line
                const midStartX = (leftX + rightX) / 2;
                const midLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const midLineD = `M ${midStartX} ${vLineEndY} V ${nameY}`;
                midLine.setAttribute("d", midLineD);
                midLine.setAttribute("class", lineClass);
                svg.append(midLine);

                // Create horizontal connection line (start from the midpoint of the two vertical lines)
                const hPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const hd = `M ${midStartX} ${nameY} H ${nameX}`;
                hPath.setAttribute("d", hd);
                hPath.setAttribute("class", lineClass);
                svg.append(hPath);
            }
        });
    }

    // Update bit description list
    function updateBitDescriptions(bitRanges, registerValue) {
        const descriptionList = $('#bit-description-list');
        descriptionList.empty();

        // Sort bit field ranges in ascending order (low to high)
        const sortedRanges = Object.entries(bitRanges).sort((a, b) => {
            const [startA] = a[0].split('-').map(Number);
            const [startB] = b[0].split('-').map(Number);
            return startA - startB; // Ascending order
        });

        sortedRanges.forEach(([range, info]) => {
            const [start, end] = range.split('-').map(Number);
            console.log(start, end)
            const isSingleBit = start === end;
            // Calculate bit field value: Extract value from register value for corresponding bit field
            const fieldWidth = start - end + 1;
            const fieldValue = (registerValue >> end) & ((1 << fieldWidth) - 1);
            const hexWidth = Math.ceil(fieldWidth / 4); // Calculate needed hexadecimal digits

            const item = $('<div>')
                .addClass('bit-description-item')
                .attr('id', `bit-field-${start}-${end}`)
                .append(
                    $('<span>')
                    .addClass('bit-range')
                    .text(isSingleBit ? `[${start}]` : `[${start}:${end}]`),
                    $('<span>')
                    .addClass('bit-field')
                    .html(`${info.field || ''}`),
                    $('<span>')
                    .addClass('bit-value')
                    .text(`0x${fieldValue.toString(16).toUpperCase().padStart(hexWidth, '0')}`),
                    $('<span>')
                    .addClass('bit-default')
                    .text(`0x${info.default.toString(16).toUpperCase().padStart(hexWidth, '0')}`),
                    $('<span>')
                    .addClass('bit-description')
                    .text(info.description),
                    $('<span>')
                    .addClass('bit-attributes')
                    .text(info.attributes.join(', '))
                );
            descriptionList.append(item);
        });
    }

    // Generate bit-box and bit-name
    function generateRegisterBits(bitCount, bitRanges = {}) {
        const registerBox = $('.register-box');
        const registerName = $('.register-name');

        // Clear existing content
        registerBox.empty();
        registerName.empty();

        // Create bit field mapping and bit field range array
        const bitFieldMap = new Map();
        const fieldRanges = [];
        Object.entries(bitRanges).forEach(([range, info]) => {
            const [start, end] = range.split('-').map(Number);
            fieldRanges.push({
                start,
                end,
                field: info.field || ''
            });
            for (let i = start; i <= end; i++) {
                bitFieldMap.set(i, info.field || '');
            }
        });

        // Sort bit fields in ascending order (low to high)
        fieldRanges.sort((a, b) => a.start - b.start);

        // Generate bit-box
        for (let i = 0; i < bitCount; i++) {
            // Create bit-box container
            const bitBoxContainer = $('<div>')
                .addClass('bit-box-container')
                .css({
                    'display': 'flex',
                    'flex-direction': 'column',
                    'align-items': 'center',
                    'margin': '0.01rem'
                });

            // Create bit number label
            const bitNumber = $('<div>')
                .addClass('bit-number')
                .css({
                    'font-size': '0.16rem',
                    'margin-bottom': '0.02rem',
                    'user-select': 'none'
                })
                .text(i);

            // Create bit-box
            const bitBox = $('<div>')
                .addClass('bit-box')
                .attr('data-bit', i)
                .text('0')
                .on('click', function () {
                    const bitIndex = $(this).data('bit');
                    const currentBitValue = $(this).hasClass('bit-1');
                    const newBitValue = !currentBitValue;

                    // Update bit box appearance
                    $(this).removeClass('bit-0 bit-1')
                        .addClass(newBitValue ? 'bit-1' : 'bit-0')
                        .text(newBitValue ? '1' : '0');

                    // Update register value
                    if (newBitValue) {
                        currentRegisterValue |= (1 << bitIndex);
                    } else {
                        currentRegisterValue &= ~(1 << bitIndex);
                    }

                    // Update display
                    updateRegisterValueDisplay(currentRegisterValue);
                    isValueModified = true;

                    // Update bit descriptions
                    updateBitDescriptions(currentBitRanges, currentRegisterValue);

                    // Update bit values in descriptions
                    updateBitDescriptionValue(bitIndex, newBitValue);
                });

            // Add mouse hover event
            bitBox.on('mouseenter', function () {
                // Find all bit fields containing the current bit
                fieldRanges.forEach(({
                    start,
                    end,
                    field
                }) => {
                    if (i >= end && i <= start) {
                        // Find corresponding bit field name element and highlight
                        $(`.bit-name[data-field-start="${start}"][data-field-end="${end}"]`).addClass('highlight');
                    }
                });
            }).on('mouseleave', function () {
                // Remove all bit field name highlights
                $('.bit-name').removeClass('highlight');
            });

            // Add bit number and bit-box to container
            bitBoxContainer.append(bitNumber, bitBox);

            // Add to DOM
            registerBox.append(bitBoxContainer);
        }

        // Generate bit field name (low to high)
        fieldRanges.forEach(({
            start,
            end,
            field
        }) => {
            const fieldName = $('<span>')
                .addClass('bit-name')
                .attr('contenteditable', 'false')
                .attr('data-field-start', start)
                .attr('data-field-end', end)
                .html(`${field}`);

            // Add mouse hover event
            fieldName.on('mouseenter', function () {
                // Highlight current bit field name
                $(this).addClass('highlight');
                // Highlight all corresponding bit-boxes
                for (let i = end; i <= start; i++) {
                    $(`.bit-box[data-bit="${i}"]`).addClass('highlight-box');
                }
            }).on('mouseleave', function () {
                // Remove bit field name highlight
                $(this).removeClass('highlight');
                // Remove all bit-box highlights
                $('.bit-box').removeClass('highlight-box');
            }).on('click', function (e) {
                // Check if Ctrl key is pressed
                if (e.ctrlKey) {
                    // Build anchor ID
                    const anchorId = `bit-field-${start}-${end}`;
                    // Get target element
                    const targetElement = document.getElementById(anchorId);
                    if (targetElement) {
                        // Smooth scroll to target position
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                        // Add temporary highlight effect
                        $(targetElement).addClass('highlight-description')
                            .delay(1000)
                            .queue(function () {
                                $(this).removeClass('highlight-description').dequeue();
                            });
                    }
                    // Prevent default click behavior
                    e.preventDefault();
                }
            });

            registerName.append(fieldName);
        });
    }

    // Update register display
    function updateRegister(registerValue, bitCount, bitRanges = {}, registerInfo = {}) {
        // Update global variables
        currentRegisterValue = registerValue;
        initialRegisterValue = registerValue;
        currentBitRanges = bitRanges;
        currentBitCount = bitCount;
        currentRegisterInfo = registerInfo;
        isValueModified = false;

        // Ensure input is a valid integer
        if (typeof registerValue !== 'number' || registerValue < 0) {
            console.error('Invalid register value: must be a non-negative integer');
            return;
        }

        // Calculate maximum value
        const maxValue = Math.pow(2, bitCount) - 1;
        if (registerValue > maxValue) {
            console.error(`Invalid register value: must be less than or equal to ${maxValue}`);
            return;
        }

        // Update register information
        if (registerInfo.name) {
            $('#register-name-value').text(registerInfo.name);
        }
        if (registerInfo.offset !== undefined) {
            $('#register-offset-value').text(`0x${registerInfo.offset.toString(16).toUpperCase().padStart(4, '0')}`);
        }

        // Update all register value displays
        const hexValue = registerValue.toString(16).toUpperCase().padStart(bitCount / 4, '0');
        $('#register-value').text(`0x${hexValue}`);
        $('#register-value-display').text(`0x${hexValue}`);

        // Store current value for line style
        $('.register-box').attr('data-value', registerValue);

        // Regenerate bit-boxes and bit-names
        generateRegisterBits(bitCount, bitRanges);

        // Update bit descriptions
        updateBitDescriptions(bitRanges, registerValue);

        // Get all bit-box elements
        const boxes = $('.bit-box');

        // Iterate through each bit
        for (let i = 0; i < bitCount; i++) {
            // Get current bit value (0 or 1)
            const bitValue = (registerValue >> i) & 1;

            // Update bit-box
            if (boxes[i]) {
                boxes[i].textContent = bitValue;
                // Set different styles based on value
                boxes[i].className = `bit-box ${bitValue ? 'bit-1' : 'bit-0'}`;
            }
        }

        // Recalculate connection lines
        calculateCoordinates();

        // Update apply button state
        updateApplyButtonState();
    }

    function updateApplyButtonState() {
        const modifyBtn = $('#modify-register-btn');
        const isDifferent = currentRegisterValue !== initialRegisterValue;
        modifyBtn.toggleClass('disabled', !isDifferent).prop('disabled', !isDifferent);
    }

    // Example: Function to update register
    function setRegisterValue(value, bitCount = 32, bitRanges = {}, registerInfo = {}) {
        updateRegister(value, bitCount, bitRanges, registerInfo);
    }

    // Test function: Random register value updates
    function startRandomTest(bitCount = 32, bitRanges = {}, registerInfo = {}) {
        // Clear any existing interval
        if (window.randomTestInterval) {
            clearInterval(window.randomTestInterval);
        }

        // Update with random value every 2 seconds
        window.randomTestInterval = setInterval(() => {
            const maxValue = Math.pow(2, bitCount) - 1;
            const randomValue = Math.floor(Math.random() * maxValue);
            console.log('New random value:', randomValue.toString(16)); // Display in hex
            setRegisterValue(randomValue, bitCount, bitRanges, registerInfo);
        }, 2000);
    }

    // Test registers data
    const testRegisters = {
        "pci": {
            "DEVICE_ID": {
                name: "Device ID Register",
                offset: 0x0000,
                description: "Device Identification Register",
                bitRanges: {
                    "31-24": {
                        field: "DEVICE_ID_H",
                        description: "Device ID High Byte",
                        default: 0x12,
                        attributes: ["RO", "Reset"]
                    },
                    "23-16": {
                        field: "DEVICE_ID_L",
                        description: "Device ID Low Byte",
                        default: 0x34,
                        attributes: ["RO", "Reset"]
                    },
                    "15-8": {
                        field: "REVISION_ID",
                        description: "Revision ID",
                        default: 0x56,
                        attributes: ["RO", "Reset"]
                    },
                    "7-0": {
                        field: "CLASS_CODE",
                        description: "Class Code",
                        default: 0x78,
                        attributes: ["RO", "Reset"]
                    }
                },
                initialValue: 0x12345678
            },
            "COMMAND": {
                name: "Command Register",
                offset: 0x0004,
                description: "Device Command Register",
                bitRanges: {
                    "31-16": {
                        field: "Reserved",
                        description: "Reserved",
                        default: 0x0000,
                        attributes: ["RO", "Reserved"]
                    },
                    "15-15": {
                        field: "SERR_EN",
                        description: "System Error Enable",
                        default: 0,
                        attributes: ["RW", "Reset"]
                    },
                    "14-14": {
                        field: "WAIT_CYCLE_EN",
                        description: "Wait Cycle Enable",
                        default: 0,
                        attributes: ["RW", "Reset"]
                    },
                    "13-13": {
                        field: "INTX_DISABLE",
                        description: "INTx Disable",
                        default: 0,
                        attributes: ["RW", "Reset"]
                    },
                    "12-10": {
                        field: "MAX_PAYLOAD_SIZE",
                        description: "Max Payload Size",
                        default: 0x2,
                        attributes: ["RW", "Reset"]
                    },
                    "9-8": {
                        field: "MAX_READ_REQ_SIZE",
                        description: "Max Read Request Size",
                        default: 0x2,
                        attributes: ["RW", "Reset"]
                    },
                    "7-7": {
                        field: "BUS_MASTER_EN",
                        description: "Bus Master Enable",
                        default: 0,
                        attributes: ["RW", "Reset"]
                    },
                    "6-6": {
                        field: "MEMORY_SPACE_EN",
                        description: "Memory Space Enable",
                        default: 0,
                        attributes: ["RW", "Reset"]
                    },
                    "5-5": {
                        field: "IO_SPACE_EN",
                        description: "I/O Space Enable",
                        default: 0,
                        attributes: ["RW", "Reset"]
                    },
                    "4-2": {
                        field: "Reserved",
                        description: "Reserved",
                        default: 0,
                        attributes: ["RO", "Reserved"]
                    },
                    "1-1": {
                        field: "INTX_STATUS",
                        description: "INTx Status",
                        default: 0,
                        attributes: ["RO", "Reset"]
                    },
                    "0-0": {
                        field: "IO_ENABLE",
                        description: "I/O Enable",
                        default: 0,
                        attributes: ["RW", "Reset"]
                    }
                },
                initialValue: 0x00000000
            },
            "STATUS": {
                name: "Status Register",
                offset: 0x0006,
                description: "Device Status Register",
                bitRanges: {
                    "31-20": {
                        field: "Reserved",
                        description: "Reserved",
                        default: 0x000,
                        attributes: ["RO", "Reserved"]
                    },
                    "19": {
                        field: "UR_DETECTED",
                        description: "Unsupported Request Detected",
                        default: 0,
                        attributes: ["RW1C", "Reset"]
                    },
                    "18": {
                        field: "FCP_DETECTED",
                        description: "Function Level Reset Detected",
                        default: 0,
                        attributes: ["RW1C", "Reset"]
                    },
                    "17": {
                        field: "TX_UR_DETECTED",
                        description: "Transmit Unsupported Request Detected",
                        default: 0,
                        attributes: ["RW1C", "Reset"]
                    },
                    "16": {
                        field: "RX_UR_DETECTED",
                        description: "Receive Unsupported Request Detected",
                        default: 0,
                        attributes: ["RW1C", "Reset"]
                    },
                    "15-14": {
                        field: "Reserved",
                        description: "Reserved",
                        default: 0,
                        attributes: ["RO", "Reserved"]
                    },
                    "13": {
                        field: "LINK_TRAINING",
                        description: "Link Training",
                        default: 0,
                        attributes: ["RO", "Reset"]
                    },
                    "12-9": {
                        field: "LINK_SPEED",
                        description: "Link Speed",
                        default: 0x1,
                        attributes: ["RO", "Reset"]
                    },
                    "8-4": {
                        field: "LINK_WIDTH",
                        description: "Link Width",
                        default: 0x1,
                        attributes: ["RO", "Reset"]
                    },
                    "3-3": {
                        field: "SIGNALED_TARGET_ABORT",
                        description: "Signaled Target Abort",
                        default: 0,
                        attributes: ["RW1C", "Reset"]
                    },
                    "2-2": {
                        field: "RECEIVED_TARGET_ABORT",
                        description: "Received Target Abort",
                        default: 0,
                        attributes: ["RW1C", "Reset"]
                    },
                    "1-1": {
                        field: "RECEIVED_MASTER_ABORT",
                        description: "Received Master Abort",
                        default: 0,
                        attributes: ["RW1C", "Reset"]
                    },
                    "0-0": {
                        field: "DETECTED_PARITY_ERROR",
                        description: "Detected Parity Error",
                        default: 0,
                        attributes: ["RW1C", "Reset"]
                    }
                },
                initialValue: 0x00001000
            }
        },
        "pcie": {
            "PCIE_CAP": {
                name: "PCIe Capability Register",
                offset: 0x0100,
                description: "PCIe Capability Register",
                bitRanges: {
                    "31-24": {
                        field: "CAP_VERSION",
                        description: "Capability Version",
                        default: 0x02,
                        attributes: ["RO", "Reset"]
                    },
                    "23-16": {
                        field: "DEVICE_TYPE",
                        description: "Device Type",
                        default: 0x00,
                        attributes: ["RO", "Reset"]
                    },
                    "15-0": {
                        field: "CAP_ID",
                        description: "Capability ID",
                        default: 0x0010,
                        attributes: ["RO", "Reset"]
                    }
                },
                initialValue: 0x02000010
            },
            "DEVICE_CAP": {
                name: "Device Capability Register",
                offset: 0x0104,
                description: "Device Capability Register",
                bitRanges: {
                    "31-24": {
                        field: "MAX_PAYLOAD_SIZE",
                        description: "Max Payload Size",
                        default: 0x02,
                        attributes: ["RO", "Reset"]
                    },
                    "23-16": {
                        field: "MAX_READ_REQ_SIZE",
                        description: "Max Read Request Size",
                        default: 0x02,
                        attributes: ["RO", "Reset"]
                    },
                    "15-0": {
                        field: "DEVICE_CAPABILITIES",
                        description: "Device Capabilities",
                        default: 0x0001,
                        attributes: ["RO", "Reset"]
                    }
                },
                initialValue: 0x02020001
            }
        },
        "pcie_ext": {
            "EXT_CAP": {
                name: "Extended Capability Register",
                offset: 0x1000,
                description: "Extended Capability Register",
                bitRanges: {
                    "31-20": {
                        field: "CAP_VERSION",
                        description: "Extended Capability Version",
                        default: 0x001,
                        attributes: ["RO", "Reset"]
                    },
                    "19-16": {
                        field: "CAP_ID",
                        description: "Extended Capability ID",
                        default: 0x0001,
                        attributes: ["RO", "Reset"]
                    },
                    "15-0": {
                        field: "NEXT_CAP_PTR",
                        description: "Next Capability Pointer",
                        default: 0x0000,
                        attributes: ["RO", "Reset"]
                    }
                },
                initialValue: 0x00100010
            },
            "EXT_CTRL": {
                name: "Extended Control Register",
                offset: 0x1004,
                description: "Extended Control Register",
                bitRanges: {
                    "31-16": {
                        field: "EXT_CONTROL",
                        description: "Extended Control",
                        default: 0x0000,
                        attributes: ["RW", "Reset"]
                    },
                    "15-0": {
                        field: "EXT_STATUS",
                        description: "Extended Status",
                        default: 0x0000,
                        attributes: ["RW1C", "Reset"]
                    }
                },
                initialValue: 0x00000000
            }
        },
        "mem": {
            "MEM_CTRL": {
                name: "Memory Control Register",
                offset: 0x2000,
                description: "Memory Control Register",
                bitRanges: {
                    "31-16": {
                        field: "MEM_CONTROL",
                        description: "Memory Control",
                        default: 0x0000,
                        attributes: ["RW", "Reset"]
                    },
                    "15-0": {
                        field: "MEM_CONFIG",
                        description: "Memory Configuration",
                        default: 0x0000,
                        attributes: ["RW", "Reset"]
                    }
                },
                initialValue: 0x00000000
            },
            "MEM_STATUS": {
                name: "Memory Status Register",
                offset: 0x2004,
                description: "Memory Status Register",
                bitRanges: {
                    "31-16": {
                        field: "MEM_STATUS",
                        description: "Memory Status",
                        default: 0x0000,
                        attributes: ["RO", "Reset"]
                    },
                    "15-0": {
                        field: "MEM_ERROR",
                        description: "Memory Error Status",
                        default: 0x0000,
                        attributes: ["RW1C", "Reset"]
                    }
                },
                initialValue: 0x00000000
            }
        }
    };

    // Update register display when a register is selected
    function updateRegisterDisplay(register) {
        if (!register) return;

        // Update register info
        $('#register-name-value').text(register.label.split(' (')[0]);
        $('#register-offset-value').text(register.offset);

        // Get register value from mock data
        const registerValue = MOCK_DATA.defaultValues[register.value] || 0;

        // Update all displays using updateRegister function
        updateRegister(
            registerValue,
            register.bitCount || 32, // Use register's bitCount or default to 32
            register.bitRanges, {
                name: register.label.split(' (')[0],
                offset: register.offset
            }
        );
    }

    // Initialize space type selector with mock data
    const spaceTypeSelect = $('#spaceType');
    MOCK_DATA.spaceTypes.forEach(spaceType => {
        spaceTypeSelect.append(
            $('<option>')
            .val(spaceType.value)
            .text(spaceType.label)
        );
    });

    // Initialize register selector when space type changes
    function updateRegisterOptions(spaceType) {
        const registerSelect = $('#registerSelect');
        registerSelect.empty();

        const registers = MOCK_DATA.registers[spaceType] || [];
        registers.forEach(register => {
            registerSelect.append(
                $('<option>')
                .val(register.value)
                .text(register.label)
            );
        });

        // Select first register by default and update display
        if (registers.length > 0) {
            const firstRegister = registers[0];
            registerSelect.val(firstRegister.value);

            // Update all displays using updateRegister function
            updateRegister(
                MOCK_DATA.defaultValues[firstRegister.value] || 0,
                firstRegister.bitCount || 32,
                firstRegister.bitRanges, {
                    name: firstRegister.label.split(' (')[0],
                    offset: firstRegister.offset
                }
            );
        }
    }

    // Handle space type change
    spaceTypeSelect.on('change', function () {
        updateRegisterOptions($(this).val());
    });

    // Handle register selection change
    $('#registerSelect').on('change', function () {
        const spaceType = spaceTypeSelect.val();
        const registerValue = $(this).val();
        const register = MOCK_DATA.registers[spaceType].find(r => r.value === registerValue);
        updateRegisterDisplay(register);
    });

    // Initialize with first space type
    $(document).ready(function () {
        // Initialize with first space type
        updateRegisterOptions(spaceTypeSelect.val());

        // Force initial update of all displays
        const firstSpaceType = spaceTypeSelect.val();
        const firstRegister = MOCK_DATA.registers[firstSpaceType][0];
        if (firstRegister) {
            updateRegisterDisplay(firstRegister);
        }
    });

    // Update register value display
    function updateRegisterValueDisplay(value) {
        const hexValue = value.toString(16).toUpperCase().padStart(currentBitCount / 4, '0');
        const formattedValue = `0x${hexValue}`;

        // Update both displays and store the last value
        $('#register-value').text(formattedValue);
        const display = $('#register-value-display');
        display.text(formattedValue);
        display.attr('data-last-value', formattedValue);

        // Update bit-boxes
        const boxes = $('.bit-box');
        for (let i = 0; i < currentBitCount; i++) {
            const bitValue = (value >> i) & 1;
            if (boxes[i]) {
                boxes[i].textContent = bitValue;
                boxes[i].className = `bit-box ${bitValue ? 'bit-1' : 'bit-0'}`;
            }
        }

        // Update bit descriptions
        updateBitDescriptions(currentBitRanges, value);

        // Update connection lines
        $('.register-box').attr('data-value', value);
        calculateCoordinates();

        // Update apply button state
        updateApplyButtonState();
    }

    function updateBitDescriptionValue(bitIndex, value) {
        // Iterate through all bit fields
        Object.entries(currentBitRanges).forEach(([range, info]) => {
            const [start, end] = range.split('-').map(Number);
            // Check if current bit is within bit field range
            if (bitIndex >= end && bitIndex <= start) {
                const descriptionItem = document.getElementById(`bit-field-${start}-${end}`);
                if (descriptionItem) {
                    const valueElement = descriptionItem.querySelector('.bit-value');
                    if (valueElement) {
                        // Calculate bit field value
                        const fieldValue = (currentRegisterValue >> end) & ((1 << (start - end + 1)) - 1);
                        // Update display
                        valueElement.textContent = `0x${fieldValue.toString(16).toUpperCase().padStart(Math.ceil((start - end + 1) / 4), '0')}`;
                    }
                }
            }
        });
    }

    function toggleBit(bitIndex) {
        const bitBox = $(`.bit-box[data-bit="${bitIndex}"]`);
        if (!bitBox.length) return;

        // Toggle bit value
        const currentBitValue = bitBox.hasClass('bit-1');
        const newBitValue = !currentBitValue;

        // Update bit box appearance
        bitBox.removeClass('bit-0 bit-1')
            .addClass(newBitValue ? 'bit-1' : 'bit-0')
            .text(newBitValue ? '1' : '0');

        // Update register value
        if (newBitValue) {
            currentRegisterValue |= (1 << bitIndex);
        } else {
            currentRegisterValue &= ~(1 << bitIndex);
        }

        // Update display
        updateRegisterValueDisplay(currentRegisterValue);
        isValueModified = true;

        // Update bit descriptions with new value
        updateBitDescriptions(currentBitRanges, currentRegisterValue);

        // Update bit values in descriptions
        updateBitDescriptionValue(bitIndex, newBitValue);

        // Update apply button state
        updateApplyButtonState();
    }

    // Add style class
    function addErrorStyles(mismatchedBits) {
        // Remove all existing error styles
        removeErrorStyles();

        // Mark mismatched bit-boxes
        mismatchedBits.forEach(bit => {
            $(`.bit-box[data-bit="${bit}"]`).addClass('error-bit');
        });

        // Mark mismatched bit field names
        Object.entries(currentBitRanges).forEach(([range, info]) => {
            const [start, end] = range.split('-').map(Number);
            // Check if this bit field contains any mismatched bits
            const hasMismatchedBit = mismatchedBits.some(bit => bit >= end && bit <= start);
            if (hasMismatchedBit) {
                $(`.bit-name[data-field-start="${start}"][data-field-end="${end}"]`).addClass('error-name');
                // Mark corresponding down-box row
                $(`#bit-field-${start}-${end}`).addClass('error-row');
            }
        });
    }

    function removeErrorStyles() {
        // Remove all error styles
        $('.bit-box').removeClass('error-bit');
        $('.bit-name').removeClass('error-name');
        $('.bit-description-item').removeClass('error-row');
    }

    function showErrorDialog(message) {
        // Create dialog
        const dialog = $('<div>')
            .addClass('error-dialog')
            .append(
                $('<div>')
                .addClass('error-dialog-content')
                .append(
                    $('<div>')
                    .addClass('error-dialog-message')
                    .text(message),
                    $('<button>')
                    .addClass('error-dialog-button')
                    .text('Confirm')
                    .on('click', function () {
                        dialog.remove();
                        // Remove error styles
                        removeErrorStyles();
                        // Update display to backend returned value
                        updateRegister(currentRegisterValue, currentBitCount, currentBitRanges, currentRegisterInfo);
                    })
                )
            );

        // Add to body
        $('body').append(dialog);
    }

    async function applyRegisterChanges() {
        if (!isValueModified) return;

        // Disable apply button
        const modifyBtn = $('#modify-register-btn');
        modifyBtn.addClass('disabled').prop('disabled', true);

        try {
            // Simulate backend response
            // Randomly generate a test scenario
            const testScenario = Math.floor(Math.random() * 3); // 0, 1, or 2
            let responseData;

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));

            switch (testScenario) {
                case 0:
                    // Scenario 1: Success, value unchanged
                    responseData = {
                        success: true,
                        value: currentRegisterValue
                    };
                    break;
                case 1:
                    // Scenario 2: Success, value modified
                    // Generate a random value different from current value
                    const maxValue = Math.pow(2, currentBitCount) - 1;
                    const randomValue = Math.floor(Math.random() * maxValue);
                    responseData = {
                        success: true,
                        value: randomValue
                    };
                    break;
                case 2:
                    // Scenario 3: Failure, other error
                    responseData = {
                        success: false,
                        message: 'Failed: Register access denied'
                    };
                    break;
            }

            // Simulate API response
            console.log('Simulated backend response:', responseData);

            if (responseData.success) {
                // If successful
                if (responseData.value === currentRegisterValue) {
                    // Value unchanged, update display directly
                    updateRegister(responseData.value, currentBitCount, currentBitRanges, currentRegisterInfo);
                } else {
                    // Calculate which bits have changed
                    const mismatchedBits = [];
                    for (let i = 0; i < currentBitCount; i++) {
                        const originalBit = (currentRegisterValue >> i) & 1;
                        const newBit = (responseData.value >> i) & 1;
                        if (originalBit !== newBit) {
                            mismatchedBits.push(i);
                        }
                    }

                    // Show error and mark mismatched bits
                    addErrorStyles(mismatchedBits);
                    showErrorDialog('Failed: Register value does not match expected value');

                    // Update current value to backend returned value
                    currentRegisterValue = responseData.value;

                    // Update all display locations
                    // 1. Update register info display
                    $('#register-value').text(`0x${responseData.value.toString(16).toUpperCase().padStart(currentBitCount/4, '0')}`);

                    // 2. Update register value display
                    updateRegisterValueDisplay(responseData.value);

                    // 3. Update all bit-box values, maintain error styles
                    const boxes = $('.bit-box');
                    for (let i = 0; i < currentBitCount; i++) {
                        const bitValue = (responseData.value >> i) & 1;
                        if (boxes[i]) {
                            const $box = $(boxes[i]);
                            const isError = mismatchedBits.includes(i);
                            $box.text(bitValue)
                                .removeClass('bit-0 bit-1')
                                .addClass(bitValue ? 'bit-1' : 'bit-0')
                                .toggleClass('error-bit', isError);
                        }
                    }

                    // 4. Update bit field descriptions
                    updateBitDescriptions(currentBitRanges, responseData.value);

                    // 5. Update connection line styles
                    $('.register-box').attr('data-value', responseData.value);
                    calculateCoordinates();
                }
            } else {
                // Handle other error cases
                addErrorStyles([]);
                showErrorDialog(responseData.message || 'Failed: Unknown error');
            }
        } catch (error) {
            // Handle network errors etc.
            console.error('Error updating register:', error);
            addErrorStyles([]);
            showErrorDialog('Failed: Network error');
        } finally {
            // Reset modification state
            isValueModified = false;
            // Re-enable apply button
            modifyBtn.removeClass('disabled').prop('disabled', false);
        }
    }

    // Add error dialog styles
    $('<style>')
        .text(`
            .error-dialog {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            .error-dialog-content {
                background: white;
                padding: 0.3rem;
                border-radius: 0.1rem;
                box-shadow: 0 0.05rem 0.2rem rgba(0, 0, 0, 0.2);
                text-align: center;
                min-width: 4rem;
                max-width: 6rem;
            }
            .error-dialog-message {
                margin-bottom: 0.3rem;
                color: #ff4444;
                font-size: 0.25rem;
                line-height: 1.4;
                padding: 0 0.2rem;
            }
            .error-dialog-button {
                padding: 0.1rem 0.4rem;
                background: #399bff;
                color: white;
                border: none;
                border-radius: 0.05rem;
                cursor: pointer;
                font-size: 0.25rem;
                transition: all 0.3s ease;
            }
            .error-dialog-button:hover {
                background: #2980ff;
                transform: translateY(-0.02rem);
            }
            .error-dialog-button:active {
                transform: translateY(0);
            }
            .error-bit {
                border-color: #ff4444 !important;
                background-color: rgba(255, 68, 68, 0.1) !important;
                animation: error-pulse 1s ease-in-out;
            }
            .error-name {
                color: #ff4444 !important;
                animation: error-pulse 1s ease-in-out;
            }
            .error-row {
                background-color: rgba(255, 68, 68, 0.05) !important;
                animation: error-pulse 1s ease-in-out;
            }
            @keyframes error-pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            body.dark-theme .error-dialog-content {
                background: #1a1a1a;
                color: #fff;
                box-shadow: 0 0.05rem 0.2rem rgba(0, 0, 0, 0.4);
            }
            body.dark-theme .error-dialog-button {
                background: #66b3ff;
            }
            body.dark-theme .error-dialog-button:hover {
                background: #4d99ff;
            }
            body.dark-theme .error-row {
                background-color: rgba(255, 68, 68, 0.1) !important;
            }
        `)
        .appendTo('head');

    // Update event listeners
    $(document).ready(function () {
        const modifyBtn = $('#modify-register-btn');
        if (modifyBtn) {
            modifyBtn.on('click', applyRegisterChanges);
            // Set initial state to disabled
            modifyBtn.addClass('disabled').prop('disabled', true);
        }
    });

    // Add event listeners for register value display editing
    $(document).ready(function () {
        const registerValueDisplay = $('#register-value-display');

        // Make the display editable on double click
        registerValueDisplay.on('dblclick', function () {
            const currentValue = $(this).text();
            // Remove '0x' prefix for editing
            const valueWithoutPrefix = currentValue.substring(2);
            const input = $('<input>')
                .attr('type', 'text')
                .val(valueWithoutPrefix)
                .css({
                    'width': '100%',
                    'height': '100%',
                    'border': 'none',
                    'background': 'transparent',
                    'font-family': 'monospace',
                    'font-size': 'inherit',
                    'color': 'inherit',
                    'text-align': 'center',
                    'padding': '0',
                    'margin': '0'
                });

            $(this).html(input);
            input.focus();

            // Select all text
            input[0].select();
        });

        // Handle value changes
        $(document).on('blur', '#register-value-display input', function () {
            const input = $(this);
            const display = input.parent();
            const newValue = input.val().trim();

            // Validate hex format (without 0x prefix)
            if (!/^[0-9A-Fa-f]+$/.test(newValue)) {
                // Invalid format, revert to previous value
                display.text(display.attr('data-last-value') || '0x00000000');
                return;
            }

            // Convert hex to number
            const numericValue = parseInt(newValue, 16);
            const maxValue = Math.pow(2, currentBitCount) - 1;

            if (numericValue > maxValue) {
                // Value too large, revert to previous value
                display.text(display.attr('data-last-value') || '0x00000000');
                return;
            }

            // Format the value with 0x prefix
            const formattedValue = `0x${newValue.toUpperCase().padStart(currentBitCount / 4, '0')}`;

            // Store the new value
            display.attr('data-last-value', formattedValue);
            display.text(formattedValue);

            // Update all displays
            currentRegisterValue = numericValue;
            isValueModified = true;
            updateRegisterValueDisplay(numericValue);
            updateApplyButtonState();
        });

        // Handle Enter key
        $(document).on('keydown', '#register-value-display input', function (e) {
            if (e.key === 'Enter') {
                $(this).blur();
            } else if (e.key === 'Escape') {
                const display = $(this).parent();
                display.text(display.attr('data-last-value') || '0x00000000');
                $(this).blur();
            }
        });
    });
});