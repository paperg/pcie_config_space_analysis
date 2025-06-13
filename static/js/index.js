/****/
$(document).ready(function() {
    // Global variable declarations
    let currentRegisterValue = 0;
    let initialRegisterValue = 0;
    let isValueModified = false;
    let currentBitRanges = {};
    let currentBitCount = 32;
    let currentRegisterInfo = {};
    let modifiedBits = new Set();

    // Create tooltip element
    const tooltip = $('<div>')
        .addClass('register-tooltip')
        .appendTo('body');

    // Check for register data from URL parameters or server data
    function checkUrlParameters() {
        // 首先检查服务器端传递的数据
        if (window.serverData) {
            if (window.serverData.error) {
                console.error('Server error:', window.serverData.error);
                showErrorMessage(window.serverData.error);
                return;
            }

            if (window.serverData.name || window.serverData.registerName) {
                console.log('Received register data from server:', window.serverData);

                // Update the register display with the server data
                initializeFromServerData(window.serverData);

                // Add a back button to return to layout page
                addBackButton(window.serverData);
                return;
            }
        }

        // 如果没有服务器数据，检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        const registerName = urlParams.get('register_name');
        const register = urlParams.get('register');
        console.log('URL params:', registerName, register);

        if (registerName) {
            try {
                const registerData = JSON.parse(decodeURIComponent(register));
                console.log('Received register data from URL:', registerData);

                // Update the register display with the passed data
                initializeFromUrlData(registerData);

                // Add a back button to return to layout page
                addBackButton(registerData);

            } catch (error) {
                console.error('Error parsing register data from URL:', error);
            }
        } else {
            console.log('No register data from URL or server');
        }
    }

    // Initialize register display from server data
    function initializeFromServerData(serverData) {
        const registerData = serverData;

        // Update register info display
        if (registerData.name) {
            $('#register-name-value').text(registerData.name);
        }
        if (registerData.offset !== undefined) {
            $('#register-offset-value').text(`0x${registerData.offset.toString(16).padStart(4, '0').toUpperCase()}`);
        }
        if (registerData.value !== undefined) {
            $('#register-value-display').text(`0x${registerData.value.toString(16).padStart(registerData.size * 2, '0').toUpperCase()}`);
            currentRegisterValue = registerData.value;
            initialRegisterValue = registerData.value;
        }

        // Store register info
        currentRegisterInfo = registerData;
        currentBitCount = (registerData.size || 4) * 8; // Convert bytes to bits

        // Create bit fields from register data
        let bitRanges = {};
        if (registerData.fields && registerData.fields.length > 0) {
            registerData.fields.forEach(field => {
                // Create range key in the format "start-end"
                const startBit = field.endBit || (field.bit_offset + field.bit_width - 1) || 0;
                const endBit = field.startBit || field.bit_offset || 0;
                const rangeKey = `${startBit}-${endBit}`;

                bitRanges[rangeKey] = {
                    field: field.name,
                    start: startBit,
                    end: endBit,
                    description: field.description || 'No description available',
                    attributes: field.attributes || 'RW',
                    default: field.default || 0
                };
            });
        } else {
            // Create a default full-width field if no fields are specified
            const rangeKey = `${currentBitCount - 1}-0`;
            bitRanges[rangeKey] = {
                field: registerData.name || 'Register',
                start: currentBitCount - 1,
                end: 0,
                description: `${registerData.name || 'Register'} value`,
                attributes: 'RW',
                default: 0
            };
        }

        currentBitRanges = bitRanges;

        // Update the register display
        updateRegister(currentRegisterValue, currentBitCount, bitRanges, registerData);
    }

    // 从后端API获取寄存器详细信息
    async function fetchRegisterFromBackend(bdf, offset, name) {
        try {
            const params = new URLSearchParams();
            params.set('bdf', bdf);
            if (offset) params.set('offset', offset);
            if (name) params.set('name', name);

            const response = await fetch(`/api/register?${params.toString()}`);

            if (response.ok) {
                const registerData = await response.json();
                console.log('Fetched register data from backend:', registerData);

                // Update the register display with the fetched data
                initializeFromUrlData(registerData);

                // Add a back button to return to layout page
                addBackButton(registerData);
            } else {
                console.error('Failed to fetch register data:', response.statusText);
                showErrorMessage('无法获取寄存器信息');
            }
        } catch (error) {
            console.error('Error fetching register data from backend:', error);
            showErrorMessage('获取寄存器信息时发生错误');
        }
    }

    // 显示错误消息
    function showErrorMessage(message) {
        const registerNameValue = $('#register-name-value');
        registerNameValue.text(message).css('color', '#ff4444');
    }

    // Initialize register display from URL data
    function initializeFromUrlData(registerData) {
        // Update register info display
        if (registerData.name) {
            $('#register-name-value').text(registerData.name);
        }
        if (registerData.offset !== undefined) {
            $('#register-offset-value').text(`0x${registerData.offset.toString(16).padStart(4, '0').toUpperCase()}`);
        }
        if (registerData.value !== undefined) {
            $('#register-value-display').text(`0x${registerData.value.toString(16).padStart(registerData.size * 2, '0').toUpperCase()}`);
            currentRegisterValue = registerData.value;
            initialRegisterValue = registerData.value;
        }

        // Store register info
        currentRegisterInfo = registerData;
        currentBitCount = (registerData.size || 4) * 8; // Convert bytes to bits

        // Create bit fields from register data  
        let bitRanges = {};
        if (registerData.fields && registerData.fields.length > 0) {
            registerData.fields.forEach(field => {
                // Create range key in the format "start-end"
                const startBit = field.endBit || (field.bit_offset + field.bit_width - 1) || 0;
                const endBit = field.startBit || field.bit_offset || 0;
                const rangeKey = `${startBit}-${endBit}`;

                bitRanges[rangeKey] = {
                    field: field.name,
                    start: startBit,
                    end: endBit,
                    description: field.description || 'No description available',
                    attributes: field.attributes || 'RW',
                    default: field.defaultValue || 0
                };
            });
        } else {
            // Create a default full-width field if no fields are specified
            const rangeKey = `${currentBitCount - 1}-0`;
            bitRanges[rangeKey] = {
                field: registerData.name || 'Register',
                start: currentBitCount - 1,
                end: 0,
                description: `${registerData.blockName || 'Register'} value`,
                attributes: 'RW',
                default: 0
            };
        }

        currentBitRanges = bitRanges;

        // Update the register display
        updateRegister(currentRegisterValue, currentBitCount, bitRanges, registerData);
    }

    // Add a back button to return to layout page
    function addBackButton(registerData) {
        const registerControls = $('.register-controls');
        const backButton = $(`
            <div class="back-button-container">
                <button class="back-btn" id="backBtn" title="返回上一页">
                    <span class="back-icon">←</span>
                    <span class="back-text">Back</span>
                </button>
            </div>
        `);

        backButton.on('click', function() {
            // Use browser back navigation (like browser back button)
            window.history.back();
        });

        registerControls.append(backButton);

        // Add some basic styling for the back button
        if (!$('#back-btn-styles').length) {
            $('head').append(`
                <style id="back-btn-styles">
                    .back-button-container {  
                        right: 0.2rem;
                        transform: translateY(-50%);
                        z-index: 10;
                    }
                    .back-btn {
                        display: flex;
                        align-items: center;
                        gap: 0.1rem;
                        background: transparent;
                        border: 0.01rem solid #ddd;
                        color: #666;
                        padding: 0.12rem 0.2rem;
                        border-radius: 0.06rem;
                        cursor: pointer;
                        font-size: 0.18rem;
                        transition: all 0.2s ease;
                        font-family: inherit;
                        height: 0.32rem;
                        min-width: 0.8rem;
                        justify-content: center;
                        margin-left: 0.2rem;
                        margin-right: 0.2rem;
                    }
                    .back-btn:hover {
                        background: #f5f5f5;
                        border-color: #999;
                        color: #333;
                        transform: translateY(-1px);
                    }
                    .back-icon {
                        font-size: 0.16rem;
                        line-height: 1;
                    }
                    .back-text {
                        font-size: 0.16rem;
                        line-height: 1;
                    }
                    body.dark-theme .back-btn {
                        border-color: #444;
                        color: #999;
                    }
                    body.dark-theme .back-btn:hover {
                        background: #2a2a2a;
                        border-color: #666;
                        color: #ccc;
                    }
                </style>
            `);
        }
    }

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

    // Check URL parameters for register data
    checkUrlParameters();

    // Initialize based on whether we have server data
    $(document).ready(function() {
        if (window.serverData && (window.serverData.name || window.serverData.registerName)) {
            // We have server data, hide the register selectors
            hideRegisterSelectors();
            console.log('Using server data for register display');
        } else {
            // No server data, show selectors and fall back to default display
            showRegisterSelectors();
            console.log('No server data available, showing empty register display');

            // Show default empty state
            $('#register-name-value').text('No Register Selected');
            $('#register-offset-value').text('--');
            $('#register-value-display').text('--');
        }
    });

    // Add debounce function
    function debounce(func, wait) {
        let timeout;
        return function() {
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

    $(window).resize(function() {
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
        fieldNames.each(function() {
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
            // Get the first and last box of the bit field
            const firstBox = boxes.eq(end);
            const lastBox = boxes.eq(start);
            const fieldName = $(element);

            if (firstBox.length && lastBox.length && fieldName.length) {
                // Get box position and size
                const firstBoxRect = firstBox[0].getBoundingClientRect();
                const lastBoxRect = lastBox[0].getBoundingClientRect();
                const nameRect = fieldName[0].getBoundingClientRect();

                // Calculate the starting points of the vertical lines
                const leftX = lastBoxRect.left - registerRect.left + lastBoxRect.width / 2;
                const rightX = firstBoxRect.left - registerRect.left + firstBoxRect.width / 2;
                const startY = firstBoxRect.top - registerRect.top + lastBoxRect.height;
                const nameX = nameRect.left - registerRect.left;
                const nameY = nameRect.top - registerRect.top + nameRect.height / 2;
                const vLineEndY = startY + 20;

                // Get bit field value for line style
                const highBitValue = (parseInt($('.register-box').attr('data-value') || '0') >> start) & 1;
                const lineClass = highBitValue ? "line-dashed" : "line";

                // Create SVG group for this field's lines
                const fieldGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                fieldGroup.setAttribute("class", `field-lines field-${start}-${end}`);
                fieldGroup.setAttribute("data-field-start", start);
                fieldGroup.setAttribute("data-field-end", end);

                // Define line segments with their hit areas
                const lineSegments = [
                    // Left vertical line
                    {
                        path: {
                            d: `M ${leftX} ${startY} V ${vLineEndY}`,
                            class: lineClass
                        },
                        hitArea: {
                            x: leftX - 3,
                            y: startY,
                            width: 6,
                            height: vLineEndY - startY
                        }
                    },
                    // Right vertical line
                    {
                        path: {
                            d: `M ${rightX} ${startY} V ${vLineEndY}`,
                            class: lineClass
                        },
                        hitArea: {
                            x: rightX - 3,
                            y: startY,
                            width: 6,
                            height: vLineEndY - startY
                        }
                    },
                    // Horizontal connecting line
                    {
                        path: {
                            d: `M ${leftX} ${vLineEndY} H ${rightX}`,
                            class: lineClass
                        },
                        hitArea: {
                            x: leftX,
                            y: vLineEndY - 3,
                            width: rightX - leftX,
                            height: 6
                        }
                    },
                    // Midpoint vertical line
                    {
                        path: {
                            d: `M ${(leftX + rightX) / 2} ${vLineEndY} V ${nameY}`,
                            class: lineClass
                        },
                        hitArea: {
                            x: (leftX + rightX) / 2 - 3,
                            y: vLineEndY,
                            width: 6,
                            height: nameY - vLineEndY
                        }
                    },
                    // Horizontal connection to name
                    {
                        path: {
                            d: `M ${(leftX + rightX) / 2} ${nameY} H ${nameX}`,
                            class: lineClass
                        },
                        hitArea: {
                            x: (leftX + rightX) / 2,
                            y: nameY - 3,
                            width: nameX - (leftX + rightX) / 2,
                            height: 6
                        }
                    }
                ];

                // Add all lines and their hit areas to group
                lineSegments.forEach(segment => {
                    // Create path
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("d", segment.path.d);
                    path.setAttribute("class", segment.path.class);
                    fieldGroup.appendChild(path);

                    // Create hit area
                    const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    hitArea.setAttribute("x", segment.hitArea.x);
                    hitArea.setAttribute("y", segment.hitArea.y);
                    hitArea.setAttribute("width", segment.hitArea.width);
                    hitArea.setAttribute("height", segment.hitArea.height);
                    hitArea.setAttribute("fill", "transparent");
                    hitArea.setAttribute("class", "line-hit-area");
                    hitArea.style.cursor = "pointer";

                    // Add event listeners to hit area
                    $(hitArea).on('mouseenter', function() {
                        const start = parseInt($(this).closest('.field-lines').attr('data-field-start'));
                        const end = parseInt($(this).closest('.field-lines').attr('data-field-end'));
                        highlightField(start, end);
                    }).on('mouseleave', function() {
                        const start = parseInt($(this).closest('.field-lines').attr('data-field-start'));
                        const end = parseInt($(this).closest('.field-lines').attr('data-field-end'));
                        clearFieldHighlight(start, end);
                    }).on('click', function(e) {
                        if (e.ctrlKey) {
                            // Ctrl+click: scroll to description
                            const anchorId = `bit-field-${start}-${end}`;
                            const targetElement = document.getElementById(anchorId);
                            if (targetElement) {
                                targetElement.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center'
                                });
                                $(targetElement).addClass('highlight-description')
                                    .delay(1000)
                                    .queue(function() {
                                        $(this).removeClass('highlight-description').dequeue();
                                    });
                            }
                            e.preventDefault();
                        } else {
                            // Normal click: show input dialog
                            const fieldWidth = start - end + 1;
                            const fieldValue = (currentRegisterValue >> end) & ((1 << fieldWidth) - 1);
                            showFieldInputDialog(start, end, fieldName.text(), fieldValue);
                        }
                    });

                    fieldGroup.appendChild(hitArea);
                });

                // Add the group to SVG
                svg.append(fieldGroup);
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
            const isSingleBit = start === end;
            const fieldWidth = start - end + 1;
            const fieldValue = (registerValue >> end) & ((1 << fieldWidth) - 1);
            const hexWidth = Math.ceil(fieldWidth / 4);

            // Get modified bits for this field, relative to the field's start position
            const modifiedBitsInField = new Set(
                Array.from(modifiedBits)
                .filter(bit => bit >= end && bit <= start)
                .map(bit => bit - end) // Convert to field-relative position
            );
            const isFieldModified = modifiedBitsInField.size > 0;

            const item = $('<div>')
                .addClass('bit-description-item')
                .attr('id', `bit-field-${start}-${end}`)
                .attr('data-field-start', start)
                .attr('data-field-end', end)
                .on('mouseenter', function() {
                    highlightField(start, end);
                })
                .on('mouseleave', function() {
                    clearFieldHighlight(start, end);
                });

            if (isFieldModified) {
                item.addClass('modified-row');
            }

            const hexValue = fieldValue.toString(16).toUpperCase().padStart(hexWidth, '0');
            let valueHtml = '0x';

            // Use highlightHexDigits with field-relative bit positions
            valueHtml += highlightHexDigits(hexValue, modifiedBitsInField, fieldWidth);

            const valueSpan = $('<span>')
                .addClass('bit-value')
                .css('cursor', 'pointer')
                .html(valueHtml)
                .on('click', function(e) {
                    showFieldInputDialog(start, end, info.field || '', fieldValue);
                });

            item.append(
                $('<span>')
                .addClass('bit-range')
                .text(isSingleBit ? `[${start}]` : `[${start}:${end}]`),
                $('<span>')
                .addClass('bit-field')
                .html(`${info.field || ''}`),
                valueSpan,
                $('<span>')
                .addClass('bit-default')
                .text(`0x${info.default.toString(16).toUpperCase().padStart(hexWidth, '0')}`),
                $('<span>')
                .addClass('bit-description')
                .text(info.description),
                $('<span>')
                .addClass('bit-attributes')
                .text(Array.isArray(info.attributes) ? info.attributes.join(', ') : (info.attributes || 'N/A'))
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
                field: info.field || '',
                attributes: info.attributes || 'RW'
            });

            for (let i = end; i <= start; i++) {
                bitFieldMap.set(i, {
                    field: info.field || '',
                    attributes: info.attributes || 'RW'
                });
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

            // Get bit field info
            const bitFieldInfo = bitFieldMap.get(i);
            const isReadOnly = bitFieldInfo &&
                (Array.isArray(bitFieldInfo.attributes) ?
                    bitFieldInfo.attributes.includes('RO') :
                    bitFieldInfo.attributes === 'RO');
            // Create bit-box
            const bitBox = $('<div>')
                .addClass('bit-box')
                .attr('data-bit', i)
                .text('0');

            // Add read-only class if applicable
            if (isReadOnly) {
                bitBox.addClass('bit-readonly');
            }

            // Only add click handler if not read-only
            if (!isReadOnly) {
                bitBox.on('click', function(e) {
                    // Check if Ctrl key is pressed
                    if (e.ctrlKey) {
                        // Find the bit field containing this bit
                        Object.entries(currentBitRanges).forEach(([range, info]) => {
                            const [start, end] = range.split('-').map(Number);
                            if (i >= end && i <= start) {
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
                                        .queue(function() {
                                            $(this).removeClass('highlight-description').dequeue();
                                        });
                                }
                            }
                        });
                        // Prevent default click behavior
                        e.preventDefault();
                        return;
                    }

                    // Normal click - toggle bit value
                    const bitIndex = $(this).data('bit');
                    const currentBitValue = $(this).hasClass('bit-1');
                    const newBitValue = !currentBitValue;

                    // Get the original bit value from initialRegisterValue
                    const originalBitValue = (initialRegisterValue >> bitIndex) & 1;

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

                    // Check if the new value matches the original value
                    if (newBitValue === originalBitValue) {
                        // If value is restored to original, remove modified mark
                        modifiedBits.delete(bitIndex);
                        $(`.bit-box[data-bit="${bitIndex}"]`).removeClass('modified');
                    } else {
                        // If value is different from original, add modified mark
                        modifiedBits.add(bitIndex);
                        $(`.bit-box[data-bit="${bitIndex}"]`).addClass('modified');
                    }

                    // Update display
                    updateRegisterValueDisplay(currentRegisterValue);
                    isValueModified = true;

                    // Update bit descriptions
                    updateBitDescriptions(currentBitRanges, currentRegisterValue);

                    // Update bit values in descriptions
                    updateBitDescriptionValue(bitIndex, newBitValue);

                    // Update apply button state
                    updateApplyButtonState();
                });
            }

            // Add mouse hover event
            bitBox.on('mouseenter', function() {
                const bitIndex = $(this).data('bit');

                // Find all bit fields containing the current bit
                let tooltipContent = '';
                let foundField = false;
                let currentStart = 0;
                let currentEnd = 0;

                fieldRanges.forEach(({
                    start,
                    end,
                    field,
                    attributes
                }) => {
                    if (bitIndex >= end && bitIndex <= start) {
                        // Find corresponding bit field info
                        const rangeKey = `${start}-${end}`;
                        const fieldInfo = currentBitRanges[rangeKey];
                        if (fieldInfo) {
                            foundField = true;
                            currentStart = start;
                            currentEnd = end;
                            const isSingleBit = start === end;
                            const fieldWidth = start - end + 1;
                            const fieldValue = (currentRegisterValue >> end) & ((1 << fieldWidth) - 1);
                            const hexWidth = Math.ceil(fieldWidth / 4);

                            tooltipContent += `
                                <div class="tooltip-title">${fieldInfo.field || 'Unnamed Field'}</div>
                                <div class="tooltip-content">
                                    <div><span class="tooltip-label">Range:</span> <span class="tooltip-value">[${start}:${end}]</span></div>
                                    <div><span class="tooltip-label">Value:</span> <span class="tooltip-value">0x${fieldValue.toString(16).toUpperCase().padStart(hexWidth, '0')}</span></div>
                                    <div><span class="tooltip-label">Default:</span> <span class="tooltip-value">0x${fieldInfo.default.toString(16).toUpperCase().padStart(hexWidth, '0')}</span></div>
                                    <div><span class="tooltip-label">Description:</span> <span class="tooltip-value">${fieldInfo.description || 'No description'}</span></div>
                                    <div><span class="tooltip-label">Attributes:</span> <span class="tooltip-value">${Array.isArray(fieldInfo.attributes) ? fieldInfo.attributes.join(', ') : (fieldInfo.attributes || 'N/A')}</span></div>
                                </div>
                            `;
                        }
                    }
                });

                if (foundField) {
                    // Position tooltip
                    const boxRect = this.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                    tooltip.html(tooltipContent)
                        .css({
                            top: boxRect.bottom + scrollTop + 10,
                            left: boxRect.left + scrollLeft - (tooltip.width() / 2) + (boxRect.width / 2)
                        })
                        .addClass('show');

                    // Highlight current bit field name
                    $(`.bit-name[data-field-start="${currentStart}"][data-field-end="${currentEnd}"]`).addClass('highlight');
                }
            }).on('mousemove', function(e) {
                // Update tooltip position on mouse move
                if (tooltip.hasClass('show')) {
                    const boxRect = this.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                    tooltip.css({
                        top: boxRect.bottom + scrollTop + 10,
                        left: boxRect.left + scrollLeft - (tooltip.width() / 2) + (boxRect.width / 2)
                    });
                }
            }).on('mouseleave', function() {
                // Hide tooltip
                tooltip.removeClass('show');
                // Remove all bit field name highlights
                $('.bit-name').removeClass('highlight');
                // Remove all bit-box highlights
                $('.bit-box').removeClass('highlight-box');
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
            fieldName.on('mouseenter', function() {
                const start = parseInt($(this).attr('data-field-start'));
                const end = parseInt($(this).attr('data-field-end'));
                highlightField(start, end);
            }).on('mouseleave', function() {
                const start = parseInt($(this).attr('data-field-start'));
                const end = parseInt($(this).attr('data-field-end'));
                clearFieldHighlight(start, end);
            }).on('click', function(e) {
                // Get field range from data attributes
                const start = parseInt($(this).attr('data-field-start'));
                const end = parseInt($(this).attr('data-field-end'));

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
                            .queue(function() {
                                $(this).removeClass('highlight-description').dequeue();
                            });
                    }
                    // Prevent default click behavior
                    e.preventDefault();
                    return;
                }

                // Get current field value
                const fieldWidth = start - end + 1;
                const fieldValue = (currentRegisterValue >> end) & ((1 << fieldWidth) - 1);

                // Show input dialog
                showFieldInputDialog(start, end, field, fieldValue);
            });

            registerName.append(fieldName);
        });
    }

    // Note: This function is kept for backward compatibility but not used with server data

    // Hide register selectors when using server data
    function hideRegisterSelectors() {
        $('.register-selectors').hide();
    }

    // Show register selectors for fallback mode
    function showRegisterSelectors() {
        $('.register-selectors').show();
    }

    // Update register value display
    function updateRegisterValueDisplay(value) {
        // 确保值是32位无符号整数
        value = value >>> 0;
        const hexValue = value.toString(16).toUpperCase().padStart(currentBitCount / 4, '0');
        const formattedValue = `0x${hexValue}`;

        // Clear all modified states first
        $('.bit-box').removeClass('modified');
        $('.bit-name').removeClass('modified-field-name');
        $('.bit-description-item').removeClass('modified-row');
        $('.bit-value').removeClass('modified-byte');
        modifiedBits.clear();

        // Reset register value display to default color
        $('#register-value').text(formattedValue);
        const display = $('#register-value-display');
        display.text(formattedValue);
        display.attr('data-last-value', formattedValue);
        display.removeClass('error');

        // Update bit-boxes and track modified fields
        const boxes = $('.bit-box');
        for (let i = 0; i < currentBitCount; i++) {
            const bitValue = (value >> i) & 1;
            const originalBitValue = (initialRegisterValue >> i) & 1;
            if (boxes[i]) {
                const $box = $(boxes[i]);
                const isModified = bitValue !== originalBitValue;

                // Update bit value and style
                $box.text(bitValue)
                    .removeClass('bit-0 bit-1 error-bit')
                    .addClass(bitValue ? 'bit-1' : 'bit-0');

                if (isModified) {
                    // Mark bit as modified
                    $box.addClass('modified');
                    modifiedBits.add(i);

                    // Find and mark the corresponding field name and value
                    Object.entries(currentBitRanges).forEach(([range, info]) => {
                        const [start, end] = range.split('-').map(Number);
                        if (i >= end && i <= start) {
                            $(`.bit-name[data-field-start="${start}"][data-field-end="${end}"]`).addClass('modified-field-name');
                        }
                    });
                }
            }
        }

        // If there are modified bits, update register value display with highlighted digits
        if (modifiedBits.size > 0) {
            const highlightedValue = highlightHexDigits(hexValue, modifiedBits, currentBitCount);
            $('#register-value').html(`0x${highlightedValue}`);
            display.html(`0x${highlightedValue}`);
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
                        const fieldWidth = start - end + 1;
                        const fieldValue = (currentRegisterValue >> end) & ((1 << fieldWidth) - 1);
                        const hexWidth = Math.ceil(fieldWidth / 4);
                        const hexValue = fieldValue.toString(16).toUpperCase().padStart(hexWidth, '0');

                        // Get modified bits for this field, relative to the field's start position
                        const modifiedBitsInField = new Set(
                            Array.from(modifiedBits)
                            .filter(bit => bit >= end && bit <= start)
                            .map(bit => bit - end) // Convert to field-relative position
                        );

                        // Use highlightHexDigits with field-relative bit positions
                        let valueHtml = '0x';
                        valueHtml += highlightHexDigits(hexValue, modifiedBitsInField, fieldWidth);

                        // Update display with highlighted value
                        valueElement.innerHTML = valueHtml;
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
                    .on('click', function() {
                        dialog.remove();
                        // Clear all marks and update display
                        clearModifiedBits();
                        removeErrorStyles();
                        // Update display to backend returned value
                        updateRegister(currentRegisterValue, currentBitCount, currentBitRanges, currentRegisterInfo);
                    })
                )
            );

        // Add to body
        $('body').append(dialog);
    }

    // Add a new function to track modified bits
    function markBitAsModified(bitIndex) {
        modifiedBits.add(bitIndex);
        $(`.bit-box[data-bit="${bitIndex}"]`).addClass('modified');
    }

    function clearModifiedBits() {
        modifiedBits.clear();
        $('.bit-box').removeClass('modified');
        $('.bit-name').removeClass('modified-field-name');
        $('.bit-description-item').removeClass('modified-row');
        $('.bit-value').removeClass('modified-byte');

        // Reset register value display to default color
        const hexValue = currentRegisterValue.toString(16).toUpperCase().padStart(currentBitCount / 4, '0');
        const formattedValue = `0x${hexValue}`;
        $('#register-value').text(formattedValue);
        $('#register-value-display').text(formattedValue);
    }

    async function applyRegisterChanges() {
        if (!isValueModified) return;

        // Determine device BDF and register info
        let deviceBdf = null;
        let registerOffset = null;
        let registerName = null;

        // Get device BDF from server data or current info
        if (window.serverData && window.serverData.deviceBdf) {
            deviceBdf = window.serverData.deviceBdf;
        }

        // Get register info from current register info
        if (currentRegisterInfo) {
            registerOffset = currentRegisterInfo.offset;
            registerName = currentRegisterInfo.name;
        }

        if (!deviceBdf || (!registerOffset && !registerName)) {
            showErrorDialog('Failed: Missing device or register information');
            return;
        }

        try {
            // Call backend API to update register value
            const requestData = {
                bdf: deviceBdf,
                value: currentRegisterValue
            };

            if (registerName) {
                requestData.name = registerName;
            }
            if (registerOffset !== null) {
                requestData.offset = registerOffset;
            }

            console.log('Sending register update request:', requestData);

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            console.log('Backend response:', responseData);

            if (responseData.success) {
                // Success - clear modified state
                isValueModified = false;
                clearModifiedBits();
                updateApplyButtonState();

                // Show success message
                showSuccessMessage('Register updated successfully');

                // Optionally refresh the register data
                if (responseData.value !== undefined && responseData.value !== currentRegisterValue) {
                    // If backend returned a different value, update display
                    currentRegisterValue = responseData.value >>> 0;
                    initialRegisterValue = responseData.value >>> 0;
                    updateRegister(responseData.value, currentBitCount, currentBitRanges, currentRegisterInfo);
                }
            } else {
                // Handle backend error
                showErrorDialog(responseData.message || 'Failed: Register update failed');
            }
        } catch (error) {
            // Handle network errors etc.
            console.error('Error updating register:', error);
            showErrorDialog('Failed: Network error - ' + error.message);
        }
    }

    // Add success message function
    function showSuccessMessage(message) {
        // Remove any existing success dialog
        $('.success-dialog').remove();

        const dialog = $(`
            <div class="success-dialog">
                <div class="success-dialog-content">
                    <div class="success-dialog-message">${message}</div>
                    <button class="success-dialog-button">OK</button>
                </div>
            </div>
        `);

        dialog.find('.success-dialog-button').on('click', function() {
            dialog.remove();
        });

        // Auto-remove after 3 seconds
        setTimeout(() => {
            dialog.remove();
        }, 3000);

        $('body').append(dialog);
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
                align-items: flex-start;
                z-index: 1000;
                padding-top: 15vh;
            }
            .error-dialog-content {
                background: white;
                padding: 0.2rem;
                border-radius: 0.08rem;
                box-shadow: 0 0.05rem 0.2rem rgba(0, 0, 0, 0.2);
                text-align: center;
                min-width: 3.2rem;
                max-width: 4.8rem;
                border: 1px solid #e0e0e0;
                transform: translateY(-0.5rem);
            }
            .error-dialog-message {
                margin-bottom: 0.2rem;
                color: #ff4444;
                font-size: 0.16rem;
                line-height: 1.4;
                padding: 0 0.15rem;
                font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
            }
            .error-dialog-button {
                padding: 0.08rem 0.3rem;
                background: #399bff;
                color: white;
                border: none;
                border-radius: 0.04rem;
                cursor: pointer;
                font-size: 0.14rem;
                font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
                transition: all 0.2s ease;
                min-width: 1.2rem;
            }
            .error-dialog-button:hover {
                background: #2980ff;
                transform: translateY(-0.01rem);
            }
            .error-dialog-button:active {
                transform: translateY(0);
                background: #1a7ae0;
            }
            body.dark-theme .error-dialog-content {
                background: #1a1a1a;
                color: #fff;
                box-shadow: 0 0.05rem 0.2rem rgba(0, 0, 0, 0.4);
                border-color: #333333;
            }
            body.dark-theme .error-dialog-message {
                color: #ff6b6b;
            }
            body.dark-theme .error-dialog-button {
                background: #66b3ff;
            }
            
            .success-dialog {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: flex-start;
                z-index: 1000;
                padding-top: 15vh;
            }
            .success-dialog-content {
                background: white;
                padding: 0.2rem;
                border-radius: 0.08rem;
                box-shadow: 0 0.05rem 0.2rem rgba(0, 0, 0, 0.2);
                text-align: center;
                min-width: 3.2rem;
                max-width: 4.8rem;
                border: 1px solid #e0e0e0;
                transform: translateY(-0.5rem);
            }
            .success-dialog-message {
                margin-bottom: 0.2rem;
                color: #28a745;
                font-size: 0.16rem;
                line-height: 1.4;
                padding: 0 0.15rem;
                font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
            }
            .success-dialog-button {
                padding: 0.08rem 0.3rem;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 0.04rem;
                cursor: pointer;
                font-size: 0.14rem;
                font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
                transition: all 0.2s ease;
                min-width: 1.2rem;
            }
            .success-dialog-button:hover {
                background: #218838;
                transform: translateY(-0.01rem);
            }
            .success-dialog-button:active {
                transform: translateY(0);
                background: #1e7e34;
            }
            body.dark-theme .success-dialog-content {
                background: #1a1a1a;
                color: #fff;
                box-shadow: 0 0.05rem 0.2rem rgba(0, 0, 0, 0.4);
                border-color: #333333;
            }
            body.dark-theme .success-dialog-message {
                color: #28c940;
            }
            body.dark-theme .success-dialog-button {
                background: #28c940;
            }
            body.dark-theme .error-dialog-button:hover {
                background: #4d99ff;
            }
            body.dark-theme .error-dialog-button:active {
                background: #3380ff;
            }
        `)
        .appendTo('head');

    // Update event listeners
    $(document).ready(function() {
        const modifyBtn = $('#modify-register-btn');
        if (modifyBtn) {
            modifyBtn.on('click', applyRegisterChanges);
            // Set initial state to disabled
            modifyBtn.addClass('disabled').prop('disabled', true);
        }
    });

    // Add event listeners for register value display editing
    $(document).ready(function() {
        const registerValueDisplay = $('#register-value-display');

        // Make the display editable on double click
        registerValueDisplay.on('dblclick', function() {
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
        $(document).on('blur', '#register-value-display input', function() {
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
        $(document).on('keydown', '#register-value-display input', function(e) {
            if (e.key === 'Enter') {
                $(this).blur();
            } else if (e.key === 'Escape') {
                const display = $(this).parent();
                display.text(display.attr('data-last-value') || '0x00000000');
                $(this).blur();
            }
        });
    });

    // Update tooltip styles
    $('<style>')
        .text(`
            .register-tooltip {
                position: fixed;
                background: #ffffff;
                color: #333333;
                padding: 0.15rem 0.2rem;
                border-radius: 0.08rem;
                font-size: 0.14rem;
                min-width: 4rem;
                max-width: 6rem;
                z-index: 1000;
                pointer-events: none;
                box-shadow: 0 0.05rem 0.15rem rgba(0, 0, 0, 0.1);
                border: 1px solid #e0e0e0;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .register-tooltip.show {
                opacity: 1;
            }

            .register-tooltip .tooltip-title {
                color: #399bff;
                font-weight: bold;
                margin-bottom: 0.05rem;
                font-size: 0.16rem;
                padding-bottom: 0.05rem;
                border-bottom: 1px solid #e0e0e0;
            }

            .register-tooltip .tooltip-content {
                color: #333333;
            }

            .register-tooltip .tooltip-content div {
                padding: 0.03rem 0;
                display: table;
                width: 100%;
            }

            .register-tooltip .tooltip-content .tooltip-label {
                color: #666666;
                display: table-cell;
                width: 1.2rem;
                vertical-align: top;
                padding-right: 0.1rem;
                white-space: nowrap;
            }

            .register-tooltip .tooltip-content .tooltip-value {
                color: #399bff;
                font-family: monospace;
                display: table-cell;
                vertical-align: top;
                white-space: pre;
                overflow-x: visible;
            }

            body.dark-theme .register-tooltip {
                background: #1a1a1a;
                color: #e0e0e0;
                border-color: #333333;
                box-shadow: 0 0.05rem 0.15rem rgba(0, 0, 0, 0.3);
            }

            body.dark-theme .register-tooltip .tooltip-title {
                color: #66b3ff;
                border-bottom-color: #333333;
            }

            body.dark-theme .register-tooltip .tooltip-content {
                color: #e0e0e0;
            }

            body.dark-theme .register-tooltip .tooltip-content .tooltip-label {
                color: #999999;
            }

            body.dark-theme .register-tooltip .tooltip-content .tooltip-value {
                color: #66b3ff;
            }
        `)
        .appendTo('head');



    // Update register function
    function updateRegister(registerValue, bitCount, bitRanges = {}, registerInfo = {}) {
        // Clear modified bits when register is updated
        clearModifiedBits();
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
            // Remove 0x prefix if it exists in the offset value
            const offsetValue = registerInfo.offset.toString().replace(/^0x/i, '');
            $('#register-offset-value').text(`0x${offsetValue.toUpperCase().padStart(4, '0')}`);
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

    // Update apply button state
    function updateApplyButtonState() {
        const modifyBtn = $('#modify-register-btn');
        const isDifferent = currentRegisterValue !== initialRegisterValue;
        modifyBtn.toggleClass('disabled', !isDifferent).prop('disabled', !isDifferent);
    }

    // Add styles for modified elements
    $('<style>')
        .text(`
            .modified {
                border-color: #ffa500 !important;
                background-color: rgba(255, 165, 0, 0.1) !important;
            }
            .modified-field-name {
                color: #ffa500 !important;
                font-weight: bold;
            }
            .modified-row {
                background-color: rgba(255, 165, 0, 0.1) !important;
                border-radius: 0.04rem;
            }
            body.dark-theme .modified {
                border-color: #ffb84d !important;
                background-color: rgba(255, 184, 77, 0.15) !important;
            }
            body.dark-theme .modified-field-name {
                color: #ffb84d !important;
            }
            body.dark-theme .modified-row {
                background-color: rgba(255, 184, 77, 0.15) !important;
            }
            .error-bit {
                border-color: #ff4444 !important;
                background-color: rgba(255, 68, 68, 0.1) !important;
                animation: error-pulse 1s ease-in-out;
            }
            @keyframes error-pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            body.dark-theme .error-bit {
                border-color: #ff6b6b !important;
                background-color: rgba(255, 107, 107, 0.15) !important;
            }
        `)
        .appendTo('head');

    // Add input dialog styles
    $('<style>')
        .text(`
            .input-dialog {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: flex-start;
                z-index: 1000;
                padding-top: 15vh;
            }
            .input-dialog-content {
                background: white;
                padding: 0.2rem;
                border-radius: 0.08rem;
                box-shadow: 0 0.05rem 0.2rem rgba(0, 0, 0, 0.2);
                text-align: center;
                min-width: 3.2rem;
                max-width: 4.8rem;
                border: 1px solid #e0e0e0;
            }
            .input-dialog-title {
                font-size: 0.16rem;
                color: #333;
                margin-bottom: 0.15rem;
                font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
            }
            .input-dialog-input {
                width: 100%;
                padding: 0.1rem;
                margin-bottom: 0.15rem;
                border: 1px solid #e0e0e0;
                border-radius: 0.04rem;
                font-size: 0.14rem;
                font-family: monospace;
                text-align: center;
                box-sizing: border-box;
            }
            .input-dialog-input:focus {
                outline: none;
                border-color: #399bff;
                box-shadow: 0 0 0 2px rgba(57, 155, 255, 0.2);
            }
            .input-dialog-buttons {
                display: flex;
                justify-content: center;
                gap: 0.1rem;
            }
            .input-dialog-button {
                padding: 0.08rem 0.3rem;
                border: none;
                border-radius: 0.04rem;
                cursor: pointer;
                font-size: 0.14rem;
                font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
                transition: all 0.2s ease;
                min-width: 1.2rem;
            }
            .input-dialog-button.confirm {
                background: #399bff;
                color: white;
            }
            .input-dialog-button.cancel {
                background: #f5f5f5;
                color: #666;
            }
            .input-dialog-button:hover {
                transform: translateY(-0.01rem);
            }
            .input-dialog-button:active {
                transform: translateY(0);
            }
            .input-dialog-button.confirm:hover {
                background: #2980ff;
            }
            .input-dialog-button.cancel:hover {
                background: #e0e0e0;
            }
            .input-dialog-error {
                color: #ff4444;
                font-size: 0.12rem;
                margin-top: 0.1rem;
                display: none;
            }
            body.dark-theme .input-dialog-content {
                background: #1a1a1a;
                border-color: #333333;
            }
            body.dark-theme .input-dialog-title {
                color: #fff;
            }
            body.dark-theme .input-dialog-input {
                background: #2a2a2a;
                border-color: #444444;
                color: #fff;
            }
            body.dark-theme .input-dialog-button.cancel {
                background: #333333;
                color: #ccc;
            }
            body.dark-theme .input-dialog-button.cancel:hover {
                background: #444444;
            }
        `)
        .appendTo('head');

    // Add function to show input dialog
    function showFieldInputDialog(start, end, fieldName, currentValue) {
        const fieldWidth = start - end + 1;
        const maxValue = (1 << fieldWidth) - 1;
        const hexWidth = Math.ceil(fieldWidth / 4);

        const dialog = $('<div>')
            .addClass('input-dialog')
            .append(
                $('<div>')
                .addClass('input-dialog-content')
                .append(
                    $('<div>')
                    .addClass('input-dialog-title')
                    .text(`${fieldName} [${start}:${end}]`),
                    $('<input>')
                    .addClass('input-dialog-input')
                    .attr('type', 'text')
                    .attr('placeholder', `Enter hex value (0-${maxValue.toString(16).toUpperCase()})`)
                    .val(currentValue.toString(16).toUpperCase()),
                    $('<div>')
                    .addClass('input-dialog-error'),
                    $('<div>')
                    .addClass('input-dialog-buttons')
                    .append(
                        $('<button>')
                        .addClass('input-dialog-button confirm')
                        .text('Confirm')
                        .on('click', function() {
                            const input = dialog.find('.input-dialog-input');
                            const error = dialog.find('.input-dialog-error');
                            const value = input.val().trim().toUpperCase();

                            // Validate input
                            if (!/^[0-9A-F]+$/.test(value)) {
                                error.text('Please enter a valid hexadecimal value').show();
                                return;
                            }

                            const numValue = parseInt(value, 16);
                            if (numValue > maxValue) {
                                error.text(`Value must be between 0 and ${maxValue.toString(16).toUpperCase()}`).show();
                                return;
                            }

                            // Update register value
                            const mask = ((1 << fieldWidth) - 1) << end;
                            const newRegisterValue = (currentRegisterValue & ~mask) | (numValue << end);

                            // Update all displays
                            currentRegisterValue = newRegisterValue;
                            isValueModified = true;

                            // Update bit-boxes and mark modified bits
                            const boxes = $('.bit-box');
                            for (let i = end; i <= start; i++) {
                                const bitValue = (numValue >> (i - end)) & 1;
                                const originalBitValue = (initialRegisterValue >> i) & 1;
                                if (boxes[i]) {
                                    const $box = $(boxes[i]);
                                    const isModified = bitValue !== originalBitValue;

                                    // Update bit value and style
                                    $box.text(bitValue)
                                        .removeClass('bit-0 bit-1')
                                        .addClass(bitValue ? 'bit-1' : 'bit-0');

                                    // Mark modified bits with orange color
                                    if (isModified) {
                                        $box.addClass('modified');
                                        modifiedBits.add(i);
                                    } else {
                                        $box.removeClass('modified');
                                        modifiedBits.delete(i);
                                    }
                                }
                            }

                            // Update register value display
                            updateRegisterValueDisplay(newRegisterValue);

                            // Close dialog
                            dialog.remove();
                        }),
                        $('<button>')
                        .addClass('input-dialog-button cancel')
                        .text('Cancel')
                        .on('click', function() {
                            dialog.remove();
                        })
                    )
                )
            );

        // Add to body
        $('body').append(dialog);

        // Focus input and select all text
        const input = dialog.find('.input-dialog-input');
        input.focus();
        input[0].select();

        // Handle Enter and Escape keys
        input.on('keydown', function(e) {
            if (e.key === 'Enter') {
                dialog.find('.input-dialog-button.confirm').click();
            } else if (e.key === 'Escape') {
                dialog.find('.input-dialog-button.cancel').click();
            }
        });
    }

    // Add styles for SVG lines
    $('<style>')
        .text(`
            .field-lines {
                pointer-events: none;
            }
            .field-lines .line-hit-area {
                pointer-events: all;
            }
            .field-lines path {
                transition: all 0.2s ease;
                pointer-events: none;
            }
            .highlight-line {
                stroke: #399bff !important;
                stroke-width: 2px !important;
            }
            .highlight-line.line-dashed {
                stroke-dasharray: 4,4 !important;
            }
            body.dark-theme .highlight-line {
                stroke: #66b3ff !important;
            }
        `)
        .appendTo('head');

    // Add styles for bit-value clickable
    $('<style>')
        .text(`
            .bit-value {
                cursor: pointer;
                color: #399bff;
                transition: color 0.2s ease;
            }
            .bit-value:hover {
                color: #2980ff;
                text-decoration: underline;
            }
            body.dark-theme .bit-value {
                color: #66b3ff;
            }
            body.dark-theme .bit-value:hover {
                color: #4d99ff;
            }
        `)
        .appendTo('head');

    // Add styles for description and tooltip text
    $('<style>')
        .text(`
            .bit-description {
                white-space: pre-wrap;
                line-height: 1.4;
            }
            .register-tooltip .tooltip-content .tooltip-value {
                white-space: pre-wrap;
                line-height: 1.4;
            }
        `)
        .appendTo('head');

    // Add highlight row style
    $('<style>')
        .text(`
            .bit-description-item.highlight-row {
                background-color: rgba(57, 155, 255, 0.1);
                border-radius: 0.04rem;
            }
            body.dark-theme .bit-description-item.highlight-row {
                background-color: rgba(102, 179, 255, 0.15);
            }
        `)
        .appendTo('head');

    // Add common highlight function
    function highlightField(start, end) {
        // Highlight field name
        $(`.bit-name[data-field-start="${start}"][data-field-end="${end}"]`).addClass('highlight');
        // Highlight bit boxes
        for (let i = end; i <= start; i++) {
            $(`.bit-box[data-bit="${i}"]`).addClass('highlight-box');
        }
        // Highlight down-box row
        $(`#bit-field-${start}-${end}`).addClass('highlight-row');
        // Highlight SVG lines
        $(`.field-lines[data-field-start="${start}"][data-field-end="${end}"] path`).addClass('highlight-line');
    }

    function clearFieldHighlight(start, end) {
        // Clear field name highlight
        $(`.bit-name[data-field-start="${start}"][data-field-end="${end}"]`).removeClass('highlight');
        // Clear bit boxes highlight
        $('.bit-box').removeClass('highlight-box');
        // Clear down-box row highlight
        $(`#bit-field-${start}-${end}`).removeClass('highlight-row');
        // Clear SVG lines highlight
        $(`.field-lines[data-field-start="${start}"][data-field-end="${end}"] path`).removeClass('highlight-line');
    }

    // Add styles for modified bytes
    $('<style>')
        .text(`
            .modified-byte {
                color: #ffa500 !important;
                font-weight: bold;
            }
            body.dark-theme .modified-byte {
                color: #ffb84d !important;
            }
        `)
        .appendTo('head');

    // Add a common function to highlight hex digits
    function highlightHexDigits(hexValue, modifiedBits, totalBits) {
        const digits = hexValue.split('');
        const highlightedDigits = digits.map((digit, digitIndex) => {
            // Calculate the bit range for this hex digit (4 bits per digit)
            const startBit = totalBits - 1 - (digitIndex * 4);
            const endBit = Math.max(startBit - 3, 0);

            // Check if any modified bits fall within this digit's range
            const isModified = Array.from(modifiedBits).some(bit =>
                bit <= startBit && bit >= endBit
            );

            return isModified ? `<span class="modified-byte">${digit}</span>` : digit;
        });
        return highlightedDigits.join('');
    }
});