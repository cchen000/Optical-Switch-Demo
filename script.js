document.addEventListener('DOMContentLoaded', () => {
    
    // 全局变量
    const switchNetwork = document.getElementById('switchNetwork');
    const signalPathDisplay = document.getElementById('signalPath');
    const connectionMappingDisplay = document.getElementById('connectionMapping');
    let activePort = null;
    let switchStates = {};  // 存储所有开关的状态
    let switchConnections = {}; // 存储所有开关的连接方式
    let connectionLines = [];  // 存储连接线元素
    let portWavelengths = {};  // 存储每个输入端口的波长信息
    
    // 连接编辑相关变量
    let isConnectionEditMode = false; // 连接编辑模式标志
    let selectedSourcePort = null; // 选择的连接源端口
    let userDefinedConnections = {}; // 用户自定义连接 {fromId: toId} 结构
    
    // 波长相关常量
    const MAX_WAVELENGTH = 8;  // 最大可用波长数量
    
    // 波长对应的颜色
    const WAVELENGTH_COLORS = {
        1: '#FF0000', // 红色
        2: '#FF7F00', // 橙色
        3: '#FFFF00', // 黄色
        4: '#00FF00', // 绿色
        5: '#0000FF', // 蓝色
        6: '#4B0082', // 靛色
        7: '#9400D3', // 紫色
        8: '#FF00FF'  // 粉色
    };

    // 默认配置
    let config = {
        mode: 'default',
        layers: 3,
        layerConfigs: [] // 每层的配置
    };

    // 初始化默认层配置
    for (let i = 0; i < config.layers; i++) {
        config.layerConfigs.push({
            switchesCount: 2,
            inputPorts: 2,
            outputPorts: 2
        });
    }

    // 设置默认连接
    const defaultConnections = {
        'switch-0-0-out-1': 'switch-1-1-in-0', // 光开关1-1的输出脚2连接至光开关2-2的输入脚1
        'switch-0-1-out-0': 'switch-1-0-in-1',  // 光开关1-2的输出脚1连接至光开关2-1的输入脚2
        'switch-1-0-out-1': 'switch-2-1-in-0',
        'switch-1-1-out-0': 'switch-2-0-in-1',
    };

    // 初始化网络
    initNetwork();

    // 模式选择按钮事件监听
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            config.mode = btn.dataset.mode;
            
            // 显示或隐藏自定义控制面板
            const customControls = document.querySelector('.custom-controls');
            customControls.style.display = config.mode === 'custom' ? 'block' : 'none';
            
            // 如果在连接编辑模式中，退出编辑模式
            if (isConnectionEditMode && config.mode !== 'custom') {
                exitConnectionEditMode();
            }
            
            if (config.mode === 'default') {
                // 重置为默认配置
                config.layers = 3;
                config.layerConfigs = [];
                
                // 初始化默认层配置
                for (let i = 0; i < config.layers; i++) {
                    config.layerConfigs.push({
                        switchesCount: 2,
                        inputPorts: 2,
                        outputPorts: 2
                    });
                }
                
                initNetwork();
            }
        });
    });

    // 生成层配置表格
    document.getElementById('generateLayerTable').addEventListener('click', () => {
        const layerCount = parseInt(document.getElementById('layerCount').value);
        if (layerCount > 0) {
            generateLayerConfigTable(layerCount);
        }
    });

    // 生成层配置表格
    function generateLayerConfigTable(layerCount) {
        // 确保层配置数组长度与层数一致
        if (config.layerConfigs.length !== layerCount) {
            // 如果层数增加，添加默认配置
            while (config.layerConfigs.length < layerCount) {
                config.layerConfigs.push({
                    switchesCount: 2,
                    inputPorts: 2,
                    outputPorts: 2
                });
            }
            // 如果层数减少，截断配置数组
            if (config.layerConfigs.length > layerCount) {
                config.layerConfigs = config.layerConfigs.slice(0, layerCount);
            }
        }

        // 获取表格元素
        const table = document.getElementById('layerParamsTable');
        const thead = table.querySelector('thead tr');
        const switchesRow = document.getElementById('switchesCountRow');
        const inputPortsRow = document.getElementById('inputPortsRow');
        const outputPortsRow = document.getElementById('outputPortsRow');

        // 清除现有列头和单元格（保留第一列）
        while (thead.children.length > 1) {
            thead.removeChild(thead.lastChild);
        }
        while (switchesRow.children.length > 1) {
            switchesRow.removeChild(switchesRow.lastChild);
        }
        while (inputPortsRow.children.length > 1) {
            inputPortsRow.removeChild(inputPortsRow.lastChild);
        }
        while (outputPortsRow.children.length > 1) {
            outputPortsRow.removeChild(outputPortsRow.lastChild);
        }

        // 添加列头和单元格
        for (let i = 0; i < layerCount; i++) {
            // 添加列头
            const th = document.createElement('th');
            th.textContent = `层 ${i+1}`;
            thead.appendChild(th);

            // 添加开关数量单元格
            const switchesCell = document.createElement('td');
            const switchesInput = document.createElement('input');
            switchesInput.type = 'number';
            switchesInput.min = '1';
            switchesInput.max = '5';
            switchesInput.value = config.layerConfigs[i].switchesCount;
            switchesInput.dataset.layer = i;
            switchesInput.dataset.param = 'switchesCount';
            switchesInput.addEventListener('change', updateLayerConfig);
            switchesCell.appendChild(switchesInput);
            switchesRow.appendChild(switchesCell);

            // 添加输入端口数单元格
            const inputPortsCell = document.createElement('td');
            const inputPortsInput = document.createElement('input');
            inputPortsInput.type = 'number';
            inputPortsInput.min = '2';
            inputPortsInput.max = '4';
            inputPortsInput.step = '2';
            inputPortsInput.value = config.layerConfigs[i].inputPorts;
            inputPortsInput.dataset.layer = i;
            inputPortsInput.dataset.param = 'inputPorts';
            inputPortsInput.addEventListener('change', updateLayerConfig);
            inputPortsCell.appendChild(inputPortsInput);
            inputPortsRow.appendChild(inputPortsCell);

            // 添加输出端口数单元格
            const outputPortsCell = document.createElement('td');
            const outputPortsInput = document.createElement('input');
            outputPortsInput.type = 'number';
            outputPortsInput.min = '2';
            outputPortsInput.max = '4';
            outputPortsInput.step = '2';
            outputPortsInput.value = config.layerConfigs[i].outputPorts;
            outputPortsInput.dataset.layer = i;
            outputPortsInput.dataset.param = 'outputPorts';
            outputPortsInput.addEventListener('change', updateLayerConfig);
            outputPortsCell.appendChild(outputPortsInput);
            outputPortsRow.appendChild(outputPortsCell);
        }

        // 显示配置表格
        document.getElementById('layerConfigTable').style.display = 'block';
    }

    // 更新层配置
    function updateLayerConfig() {
        const layer = parseInt(this.dataset.layer);
        const param = this.dataset.param;
        const value = parseInt(this.value);

        if (!isNaN(value) && value > 0) {
            config.layerConfigs[layer][param] = value;
        }
    }

    // 应用自定义配置按钮事件监听
    document.getElementById('applyCustomConfig').addEventListener('click', () => {
        const layerCount = parseInt(document.getElementById('layerCount').value);
        
        if (layerCount > 0) {
            config.layers = layerCount;
            initNetwork();
        }
    });

    // 初始化光开关网络
    function initNetwork() {
        // 清空现有网络
        switchNetwork.innerHTML = '';
        switchStates = {};
        switchConnections = {};
        connectionLines = [];
        activePort = null;
        portWavelengths = {}; // 重置波长信息
        
        // 如果在默认模式下，设置默认连接
        if (config.mode === 'default') {
            userDefinedConnections = {...defaultConnections};
        }
        
        // 计算总输入端口数（第一层的所有开关输入端口总和）
        const firstLayerConfig = config.layerConfigs[0];
        const inputPortCount = firstLayerConfig ? firstLayerConfig.switchesCount * firstLayerConfig.inputPorts : 0;
        
        // 计算总输出端口数（最后一层的所有开关输出端口总和）
        const lastLayerConfig = config.layerConfigs[config.layers - 1];
        const outputPortCount = lastLayerConfig ? lastLayerConfig.switchesCount * lastLayerConfig.outputPorts : 0;
        
        // 调整输入输出端口的显示
        adjustPorts('.inputs', inputPortCount, 'in');
        adjustPorts('.outputs', outputPortCount, 'out');
        
        // 创建开关层
        for (let layer = 0; layer < config.layers; layer++) {
            const layerDiv = document.createElement('div');
            layerDiv.className = 'switch-layer';
            layerDiv.dataset.layer = layer;
            
            const layerConfig = config.layerConfigs[layer];
            
            for (let sw = 0; sw < layerConfig.switchesCount; sw++) {
                const switchId = `switch-${layer}-${sw}`;
                const switchElem = document.createElement('div');
                switchElem.className = 'optical-switch';
                switchElem.dataset.switch = switchId;
                switchElem.dataset.layer = layer;
                switchElem.dataset.position = sw;
                
                // 创建开关标签
                const switchLabel = document.createElement('div');
                switchLabel.className = 'switch-label';
                switchLabel.textContent = `Switch ${layer+1}-${sw+1}`;
                switchElem.appendChild(switchLabel);
                
                // 创建开关状态标签
                const switchState = document.createElement('div');
                switchState.className = 'switch-state';
                switchElem.appendChild(switchState);
                
                // 创建连接状态可视化
                const connectionVisual = document.createElement('div');
                connectionVisual.className = 'connection-visual';
                switchElem.appendChild(connectionVisual);
                
                // 创建端口容器
                const portsContainer = document.createElement('div');
                portsContainer.className = 'switch-ports';
                
                // 获取当前层的输入端口数
                const inputPortsCount = layerConfig.inputPorts;
                
                // 创建输入端口
                for (let p = 0; p < inputPortsCount; p++) {
                    const inputPort = document.createElement('div');
                    inputPort.className = `switch-port input ${getPortPositionClass(p, inputPortsCount)}`;
                    inputPort.dataset.port = `${switchId}-in-${p}`;
                    inputPort.dataset.type = 'in';
                    inputPort.dataset.index = p;
                    
                    // 添加端口标签
                    const portLabel = document.createElement('span');
                    portLabel.className = 'port-label input-label';
                    portLabel.textContent = `i${p}`;
                    inputPort.appendChild(portLabel);
                    
                    portsContainer.appendChild(inputPort);
                }
                
                // 获取当前层的输出端口数
                const outputPortsCount = layerConfig.outputPorts;
                
                // 创建输出端口
                for (let p = 0; p < outputPortsCount; p++) {
                    const outputPort = document.createElement('div');
                    outputPort.className = `switch-port output ${getPortPositionClass(p, outputPortsCount)}`;
                    outputPort.dataset.port = `${switchId}-out-${p}`;
                    outputPort.dataset.type = 'out';
                    outputPort.dataset.index = p;
                    
                    // 添加端口标签
                    const portLabel = document.createElement('span');
                    portLabel.className = 'port-label output-label';
                    portLabel.textContent = `o${p}`;
                    outputPort.appendChild(portLabel);
                    
                    portsContainer.appendChild(outputPort);
                }
                
                switchElem.appendChild(portsContainer);
                
                // 初始化开关状态和连接方式
                const stateId = 0; // 默认状态为0
                switchStates[switchId] = stateId;
                
                // 初始化连接配置（默认为直连状态）
                initSwitchConnections(switchId, stateId, layerConfig.inputPorts, layerConfig.outputPorts);
                
                // 更新状态显示
                updateSwitchStateDisplay(switchElem, stateId);
                
                // 点击切换开关状态
                switchElem.addEventListener('click', toggleSwitchState);
                
                // 右键点击打开连接配置菜单
                switchElem.addEventListener('contextmenu', showConnectionConfigMenu);
                
                layerDiv.appendChild(switchElem);
            }
            
            switchNetwork.appendChild(layerDiv);
        }
        
        // 绘制连接线
        drawConnectionLines();
        
        // 添加端口点击事件
        document.querySelectorAll('.port').forEach(port => {
            port.addEventListener('click', function() {
                const portId = this.dataset.port;
                
                // 如果在连接编辑模式中，忽略外部端口的点击
                if (isConnectionEditMode) {
                    return;
                }
                
                // 如果是输入端口且当前已激活（第二次点击），则显示波长设置对话框
                if (portId.startsWith('in-') && activePort === this) {
                    showWavelengthDialog(portId);
                    return;
                }
                
                // 清除之前选中的端口
                if (activePort) {
                    activePort.classList.remove('active');
                    clearActiveSignalPath();
                }
                
                // 设置当前选中的端口
                this.classList.add('active');
                activePort = this;
                
                // 如果是输入端口，显示信号路径
                if (portId.startsWith('in-')) {
                    showSignalPath(portId);
                }
                
                // 更新连接关系
                updateConnectionMapping();
            });
        });
        
        // 添加开关端口点击事件
        initSwitchPortEvents();
        
        // 在初始化网络后更新连接关系
        updateConnectionMapping();
        
        // 初始化连接编辑模式控件
        initConnectionEditMode();
    }

    // 初始化开关连接方式
    function initSwitchConnections(switchId, stateId, inputPortsCount, outputPortsCount) {
        // 创建连接映射
        if (!switchConnections[switchId]) {
            switchConnections[switchId] = {};
        }
        
        // 初始化常见状态（前6种状态）
        const commonStates = Math.min(6, factorial(inputPortsCount));
        
        for (let i = 0; i < commonStates; i++) {
            // 为常见状态生成连接配置
            const connections = generateConnectionConfig(i, inputPortsCount, outputPortsCount);
            switchConnections[switchId][i] = connections;
        }
        
        // 确保当前状态已初始化（如果不是常见状态）
        if (stateId >= commonStates && !switchConnections[switchId][stateId]) {
            switchConnections[switchId][stateId] = generateConnectionConfig(stateId, inputPortsCount, outputPortsCount);
        }
    }
    
    // 生成连接配置
    function generateConnectionConfig(stateId, inputPortsCount, outputPortsCount) {
        const connections = {};
        
        // 检查输入和输出端口数是否相等
        if (inputPortsCount === outputPortsCount) {
            if (stateId === 0) {
                // 状态0: 直连模式
                for (let i = 0; i < inputPortsCount; i++) {
                    connections[i] = i;
                }
            } else if (stateId === 1 && inputPortsCount === 2) {
                // 状态1: 2端口交叉模式
                connections[0] = 1;
                connections[1] = 0;
            } else if (stateId === 1 && inputPortsCount === 4) {
                // 状态1: 4端口完全交叉模式
                connections[0] = 3;
                connections[1] = 2;
                connections[2] = 1;
                connections[3] = 0;
            } else {
                // 生成排列
                const outputPorts = Array.from({length: inputPortsCount}, (_, i) => i);
                const permutation = generatePermutation(outputPorts, stateId);
                
                for (let i = 0; i < inputPortsCount; i++) {
                    connections[i] = permutation[i];
                }
            }
        } else {
            // 如果输入输出端口数不等，采用简单的映射策略
            // 这里使用模运算确保连接在有效范围内
            for (let i = 0; i < inputPortsCount; i++) {
                connections[i] = i % outputPortsCount;
            }
        }
        
        return connections;
    }
    
    // 生成第n个排列
    function generatePermutation(arr, n) {
        const len = arr.length;
        
        // 对于常见状态，使用预定义模式提高性能
        if (n === 0) {
            // 状态0: 直连模式（不变）
            return [...arr];
        } else if (n === 1) {
            // 状态1: 完全交叉模式（反转）
            return [...arr].reverse();
        } else if (n === 2 && len === 4) {
            // 双交叉模式 (0-1交叉，2-3交叉)
            return [1, 0, 3, 2];
        } else if (n === 3 && len === 4) {
            // 环形移位模式
            return [1, 2, 3, 0]; 
        } else if (n === 4 && len === 4) {
            // 反向环形移位
            return [3, 0, 1, 2];
        } else if (n === 5 && len === 4) {
            // 混合模式
            return [2, 0, 3, 1];
        } else {
            // 使用数学方法生成第n个排列
            return generateNthPermutation(arr, n);
        }
    }
    
    // 计算阶乘
    function factorial(n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    
    // 生成第n个排列的算法（基于阶乘数系统）
    function generateNthPermutation(arr, n) {
        const len = arr.length;
        // 创建一个新数组避免修改原数组
        const elements = [...arr];
        const result = [];
        
        // 对于非常大的n，我们取模以避免溢出
        const totalPermutations = factorial(len);
        n = n % totalPermutations;
        
        // 生成第n个排列
        for (let i = len - 1; i >= 0; i--) {
            const fact = factorial(i);
            const index = Math.floor(n / fact);
            result.push(elements.splice(index, 1)[0]);
            n %= fact;
        }
        
        return result;
    }
    
    // 显示连接配置菜单
    function showConnectionConfigMenu(e) {
        e.preventDefault(); // 阻止默认右键菜单
        
        const switchId = this.dataset.switch;
        const currentState = switchStates[switchId];
        const [_, layer, position] = switchId.split('-');
        
        // 获取当前开关所在层的配置
        const layerConfig = config.layerConfigs[parseInt(layer)];
        const inputPortsCount = layerConfig.inputPorts;
        const outputPortsCount = layerConfig.outputPorts;
        
        // 确定应该显示的状态数量
        let menuStates;
        if (inputPortsCount === 2) {
            menuStates = 2; // 2端口显示2种状态
        } else if (inputPortsCount === 4) {
            menuStates = Math.min(24, 12); // 4端口显示12种状态（限制菜单大小）
        } else {
            menuStates = 2; // 默认只显示2种状态
        }
        
        // 创建菜单
        let menuHtml = `<div class="connection-menu-title">选择连接状态</div>`;
        
        for (let i = 0; i < menuStates; i++) {
            // 确保连接配置存在
            if (!switchConnections[switchId][i]) {
                switchConnections[switchId][i] = generateConnectionConfig(i, inputPortsCount, outputPortsCount);
            }
            
            const connections = switchConnections[switchId][i];
            let connectionDesc = '';
            
            // 生成连接描述
            for (let inputPort in connections) {
                connectionDesc += `i${inputPort}→o${connections[inputPort]} `;
            }
            
            const isActive = currentState === i ? 'active' : '';
            menuHtml += `<div class="connection-menu-item ${isActive}" data-state="${i}">
                            状态 ${i}: ${getStateName(i, inputPortsCount)}
                            <span class="connection-detail">${connectionDesc}</span>
                        </div>`;
        }
        
        // 创建并显示菜单
        const menu = document.createElement('div');
        menu.className = 'connection-config-menu';
        menu.innerHTML = menuHtml;
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        document.body.appendChild(menu);
        
        // 选择连接状态
        menu.querySelectorAll('.connection-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const newState = parseInt(item.dataset.state);
                
                // 更新开关状态
                switchStates[switchId] = newState;
                
                // 更新状态显示
                updateSwitchStateDisplay(this, newState);
                
                // 移除菜单
                menu.remove();
                
                // 如果有活跃的端口，更新信号路径
                if (activePort) {
                    const portType = activePort.dataset.type || (activePort.dataset.port.startsWith('in-') ? 'in' : 'out');
                    if (portType === 'in') {
                        showSignalPath(activePort.dataset.port);
                    }
                }
                
                // 显示连接状态信息
                showConnectionStatus(this, newState);
            });
        });
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }
    
    // 获取状态名称
    function getStateName(stateId, portCount) {
        // 常见状态使用特定名称
        if (stateId === 0) return "直通";
        if (stateId === 1 && portCount === 2) return "交叉";
        if (stateId === 1 && portCount === 4) return "完全交叉";
        
        // 4端口特殊状态名称
        if (portCount === 4) {
            if (stateId === 2) return "双交叉";
            if (stateId === 3) return "环形移位";
            if (stateId === 4) return "反向移位";
            if (stateId === 5) return "混合模式";
            if (stateId === 6) return "转换A";
            if (stateId === 12) return "转换B";
            if (stateId === 18) return "转换C";
            if (stateId === 23) return "特殊模式";
            return `排列 #${stateId}`;
        } 
        
        return `状态 ${stateId}`;
    }
    
    // 更新开关状态显示
    function updateSwitchStateDisplay(switchElem, stateId) {
        const switchId = switchElem.dataset.switch;
        const [_, layer, position] = switchId.split('-');
        
        // 获取当前开关所在层的配置
        const layerConfig = config.layerConfigs[parseInt(layer)];
        const inputPortsCount = layerConfig.inputPorts;
        const outputPortsCount = layerConfig.outputPorts;
        
        // 更新状态标签
        const stateLabel = switchElem.querySelector('.switch-state');
        stateLabel.textContent = `State: ${stateId} (${getStateName(stateId, inputPortsCount)})`;
        
        // 更新连接状态可视化
        const connectionVisual = switchElem.querySelector('.connection-visual');
        
        // 移除所有现有的连接线
        connectionVisual.innerHTML = '';
        
        // 创建连接线可视化
        const connections = switchConnections[switchId][stateId];
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
        
        // 计算开关宽高
        const switchWidth = connectionVisual.offsetWidth || 80;
        const switchHeight = connectionVisual.offsetHeight || 80;
        
        for (let inputPort in connections) {
            const outputPort = connections[inputPort];
            const inputIdx = parseInt(inputPort);
            const outputIdx = parseInt(outputPort);
            
            // 创建连接线
            const line = document.createElement('div');
            line.className = 'switch-connection-line';
            line.dataset.from = `${switchId}-in-${inputIdx}`;
            line.dataset.to = `${switchId}-out-${outputIdx}`;
            
            // 计算连接线位置和角度
            const inputY = getPortPosition(inputIdx, inputPortsCount) * switchHeight / 100;
            const outputY = getPortPosition(outputIdx, outputPortsCount) * switchHeight / 100;
            
            // 计算线长和角度
            const length = Math.sqrt(Math.pow(switchWidth, 2) + Math.pow(outputY - inputY, 2));
            const angle = Math.atan2(outputY - inputY, switchWidth) * 180 / Math.PI;
            
            // 设置线的位置和样式
            line.style.width = `${length}px`;
            line.style.left = '0';
            line.style.top = `${inputY}px`;
            line.style.transform = `rotate(${angle}deg)`;
            line.style.backgroundColor = colors[inputIdx % colors.length];
            
            connectionVisual.appendChild(line);
        }
        
        // 更新开关状态类名
        switchElem.className = 'optical-switch';
        switchElem.classList.add(`state-${stateId}`);
    }
    
    // 获取端口的百分比位置
    function getPortPosition(index, totalPorts) {
        if (totalPorts === 2) {
            return index === 0 ? 25 : 75;
        } else if (totalPorts === 4) {
            // 修正后的单调分布
            if (index === 0) return 10;    // 原来是12.5
            if (index === 1) return 33.3;  // 原来是37.5
            if (index === 2) return 66.7;  // 原来是62.5
            if (index === 3) return 90;    // 原来是87.5
        } 
        // 均匀分布
        return (index + 0.5) * (100 / totalPorts);
    }

    // 获取端口位置类名
    function getPortPositionClass(index, totalPorts) {
        if (totalPorts === 2) {
            return index === 0 ? 'top' : 'bottom';
        } else if (totalPorts === 4) {
            // 使用统一的命名方式
            if (index === 0) return 'position-0';
            if (index === 1) return 'position-1';
            if (index === 2) return 'position-2';
            if (index === 3) return 'position-3';
        }
        return `position-${index}`;
    }

    // 调整端口数量
    function adjustPorts(selector, count, type) {
        const portsContainer = document.querySelector(selector);
        portsContainer.innerHTML = '';
        
        for (let i = 1; i <= count; i++) {
            const portDiv = document.createElement('div');
            portDiv.className = 'port';
            portDiv.dataset.port = `${type}-${i}`;
            portDiv.textContent = `${type === 'in' ? '输入' : '输出'} ${i}`;
            
            // 为输入端口添加波长信息
            if (type === 'in') {
                // 初始化波长信息，默认为波长1
                const portId = `${type}-${i}`;
                portWavelengths[portId] = [[1]];
                
                // 添加波长显示
                const wavelengthInfo = document.createElement('div');
                wavelengthInfo.className = 'wavelength-info';
                wavelengthInfo.textContent = `λ:1`;
                portDiv.appendChild(wavelengthInfo);
            }
            
            portsContainer.appendChild(portDiv);
        }
    }

    // 切换开关状态
    function toggleSwitchState() {
        const switchId = this.dataset.switch;
        const currentState = parseInt(switchStates[switchId]);
        const [_, layer, position] = switchId.split('-');
        
        // 获取当前开关所在层的配置
        const layerConfig = config.layerConfigs[parseInt(layer)];
        const inputPortsCount = layerConfig.inputPorts;
        const outputPortsCount = layerConfig.outputPorts;
        
        // 确定最大状态数
        let maxStates;
        if (inputPortsCount === 2) {
            maxStates = 2; // 2端口有2种状态
        } else if (inputPortsCount === 4) {
            maxStates = 24; // 4端口有24种状态 (4!)
        } else {
            maxStates = 2; // 默认只有2种状态
        }
        
        // 循环切换到下一个状态
        const newState = (currentState + 1) % maxStates;
        
        // 确保连接配置存在
        if (!switchConnections[switchId][newState]) {
            switchConnections[switchId][newState] = generateConnectionConfig(newState, inputPortsCount, outputPortsCount);
        }
        
        // 更新开关状态
        switchStates[switchId] = newState;
        
        // 更新状态显示
        updateSwitchStateDisplay(this, newState);
        
        // 如果有活跃的端口，更新信号路径
        if (activePort) {
            const portType = activePort.dataset.type || (activePort.dataset.port.startsWith('in-') ? 'in' : 'out');
            if (portType === 'in') {
                showSignalPath(activePort.dataset.port);
            }
        }
        
        // 显示连接状态信息
        showConnectionStatus(this, newState);
        
        // 更新所有连接关系映射
        updateConnectionMapping();
    }
    
    // 显示连接状态信息
    function showConnectionStatus(switchElem, stateId) {
        const switchId = switchElem.dataset.switch;
        const [_, layer, position] = switchId.split('-');
        
        // 获取当前开关所在层的配置
        const layerConfig = config.layerConfigs[parseInt(layer)];
        const inputPortsCount = layerConfig.inputPorts;
        
        let statusMessage = `开关 ${parseInt(layer)+1}-${parseInt(position)+1} 状态变为: ${stateId} (${getStateName(stateId, inputPortsCount)})`;
        
        // 添加端口连接信息
        statusMessage += '<br>端口连接: ';
        
        const connections = switchConnections[switchId][stateId];
        for (let inputPort in connections) {
            const outputPort = connections[inputPort];
            statusMessage += `i${inputPort}→o${outputPort} `;
        }
        
        signalPathDisplay.innerHTML = statusMessage;
        
        // 更新所有连接关系映射
        updateConnectionMapping();
    }

    // 绘制连接线
    function drawConnectionLines() {
        // 清除现有连接线
        connectionLines.forEach(line => line.remove());
        connectionLines = [];
        
        const layers = document.querySelectorAll('.switch-layer');
        const inputs = document.querySelectorAll('.inputs .port');
        const outputs = document.querySelectorAll('.outputs .port');
        
        // 连接输入端口到第一层开关的输入端口
        if (layers.length > 0) {
            const firstLayer = layers[0];
            const firstLayerSwitches = firstLayer.querySelectorAll('.optical-switch');
            const firstLayerConfig = config.layerConfigs[0];
            
            // 分配输入端口到第一层开关
            let portIndex = 0;
            for (let switchIdx = 0; switchIdx < firstLayerConfig.switchesCount; switchIdx++) {
                const switchElem = firstLayerSwitches[switchIdx];
                
                if (switchElem) {
                    // 获取当前开关的输入端口数
                    const inputPortsCount = firstLayerConfig.inputPorts;
                    
                    // 连接到开关的每个输入端口
                    for (let portIdx = 0; portIdx < inputPortsCount; portIdx++) {
                        const input = inputs[portIndex];
                        const targetPort = switchElem.querySelector(`.switch-port.input.${getPortPositionClass(portIdx, inputPortsCount)}`);
                        
                        if (input && targetPort) {
                            const line = createConnectionLine(input, targetPort);
                            connectionLines.push(line);
                        }
                        
                        portIndex++;
                    }
                }
            }
            
            // 连接层与层之间的开关端口
            for (let i = 0; i < layers.length - 1; i++) {
                const currentLayer = layers[i];
                const nextLayer = layers[i + 1];
                const currentSwitches = currentLayer.querySelectorAll('.optical-switch');
                const nextSwitches = nextLayer.querySelectorAll('.optical-switch');
                
                // 获取当前层和下一层的配置
                const currentLayerConfig = config.layerConfigs[i];
                const nextLayerConfig = config.layerConfigs[i + 1];
                
                // 为当前层中的每个开关连接输出端口
                for (let switchIdx = 0; switchIdx < currentLayerConfig.switchesCount; switchIdx++) {
                    const currentSwitch = currentSwitches[switchIdx];
                    
                    if (currentSwitch) {
                        // 获取当前开关的输出端口数
                        const outputPortsCount = currentLayerConfig.outputPorts;
                        
                        // 连接到每个输出端口
                        for (let portIdx = 0; portIdx < outputPortsCount; portIdx++) {
                            const outputPort = currentSwitch.querySelector(`.switch-port.output.${getPortPositionClass(portIdx, outputPortsCount)}`);
                            
                            if (outputPort) {
                                // 计算下一层的目标开关和端口
                                const [targetSwitchIdx, targetPortIdx] = calculateNextLayerConnection(
                                    switchIdx, portIdx, i,
                                    currentLayerConfig.switchesCount, outputPortsCount,
                                    nextLayerConfig.switchesCount, nextLayerConfig.inputPorts
                                );
                                
                                const targetSwitch = nextSwitches[targetSwitchIdx];
                                
                                if (targetSwitch) {
                                    const targetPort = targetSwitch.querySelector(`.switch-port.input.${getPortPositionClass(targetPortIdx, nextLayerConfig.inputPorts)}`);
                                    
                                    if (targetPort) {
                                        const line = createConnectionLine(outputPort, targetPort);
                                        connectionLines.push(line);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // 连接最后一层开关的输出端口到输出端口
            const lastLayer = layers[layers.length - 1];
            const lastLayerSwitches = lastLayer.querySelectorAll('.optical-switch');
            const lastLayerConfig = config.layerConfigs[config.layers - 1];
            
            // 分配输出端口
            let outputPortIndex = 0;
            for (let switchIdx = 0; switchIdx < lastLayerConfig.switchesCount; switchIdx++) {
                const switchElem = lastLayerSwitches[switchIdx];
                
                if (switchElem) {
                    // 获取当前开关的输出端口数
                    const outputPortsCount = lastLayerConfig.outputPorts;
                    
                    // 连接到每个输出端口
                    for (let portIdx = 0; portIdx < outputPortsCount; portIdx++) {
                        const outputPort = switchElem.querySelector(`.switch-port.output.${getPortPositionClass(portIdx, outputPortsCount)}`);
                        const output = outputs[outputPortIndex];
                        
                        if (outputPort && output) {
                            const line = createConnectionLine(outputPort, output);
                            connectionLines.push(line);
                        }
                        
                        outputPortIndex++;
                    }
                }
            }
        }
    }

    // 计算下一层的目标开关和端口
    function calculateNextLayerConnection(currentSwitchIdx, outputPortIdx, layerIdx, 
                                        currentLayerSwitchCount, currentLayerOutputPortsCount,
                                        nextLayerSwitchCount, nextLayerInputPortsCount) {
        // 首先检查是否有用户自定义的连接
        const fromId = `switch-${layerIdx}-${currentSwitchIdx}-out-${outputPortIdx}`;
        
        // 如果存在用户自定义的连接，则优先使用
        if (userDefinedConnections[fromId]) {
            const toId = userDefinedConnections[fromId];
            // 提取目标开关和端口的索引
            const matches = toId.match(/switch-(\d+)-(\d+)-in-(\d+)/);
            if (matches) {
                return [parseInt(matches[2]), parseInt(matches[3])];
            }
        }
        
        // 没有自定义连接时使用默认算法
        // 简单的轮询分配策略
        
        // 计算当前端口的全局索引
        const globalPortIndex = currentSwitchIdx * currentLayerOutputPortsCount + outputPortIdx;
        
        // 计算下一层的总输入端口数
        const nextLayerTotalInputPorts = nextLayerSwitchCount * nextLayerInputPortsCount;
        
        // 使用模运算确保索引在范围内
        const nextLayerGlobalPortIndex = globalPortIndex % nextLayerTotalInputPorts;
        
        // 计算目标开关和端口索引
        const targetSwitchIdx = Math.floor(nextLayerGlobalPortIndex / nextLayerInputPortsCount);
        const targetPortIdx = nextLayerGlobalPortIndex % nextLayerInputPortsCount;
        
        return [targetSwitchIdx, targetPortIdx];
    }

    // 创建连接线
    function createConnectionLine(from, to) {
        const line = document.createElement('div');
        line.className = 'connection-line';
        switchNetwork.appendChild(line);
        
        const fromRect = from.getBoundingClientRect();
        const toRect = to.getBoundingClientRect();
        const networkRect = switchNetwork.getBoundingClientRect();
        
        // 计算起点和终点（相对于switchNetwork）
        let startX, startY, endX, endY;
        
        if (from.classList.contains('port')) {
            // 如果是从外部端口出发
            startX = fromRect.right - networkRect.left;
            startY = fromRect.top + fromRect.height / 2 - networkRect.top;
        } else {
            // 如果是从开关端口出发
            startX = fromRect.left + fromRect.width / 2 - networkRect.left;
            startY = fromRect.top + fromRect.height / 2 - networkRect.top;
        }
        
        if (to.classList.contains('port')) {
            // 如果是到外部端口结束
            endX = toRect.left - networkRect.left;
            endY = toRect.top + toRect.height / 2 - networkRect.top;
        } else {
            // 如果是到开关端口结束
            endX = toRect.left + toRect.width / 2 - networkRect.left;
            endY = toRect.top + toRect.height / 2 - networkRect.top;
        }
        
        // 设置线的位置和尺寸
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
        
        line.style.width = `${length}px`;
        line.style.left = `${startX}px`;
        line.style.top = `${startY}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.transformOrigin = '0 0';
        
        // 存储连接信息
        line.dataset.from = from.classList.contains('port') ? from.dataset.port : from.dataset.port;
        line.dataset.to = to.classList.contains('port') ? to.dataset.port : to.dataset.port;
        
        return line;
    }

    // 显示信号路径
    function showSignalPath(inputPort) {
        clearActiveSignalPath();
        
        // 获取波长信息
        const wavelengths = portWavelengths[inputPort] || [[1]];
        
        // 寻找从输入端口到输出端口的路径
        const path = findSignalPath(inputPort);
        
        if (path.length > 0) {
            // 高亮路径中的连接线
            path.forEach(connection => {
                const parts = connection.split(' -> ');
                const fromId = parts[0];
                const toId = parts[1].split(' [')[0];
                
                connectionLines.forEach(line => {
                    if (line.dataset.from === fromId && line.dataset.to === toId) {
                        line.classList.add('active');
                    }
                });
            });
            
            // 显示路径信息（更详细的格式）
            let pathInfo = '<strong>信号路径:</strong><br>';
            
            // 添加波长信息
            pathInfo += '<div class="wavelength-path-info">';
            wavelengths.forEach((group, index) => {
                if (index > 0) pathInfo += ', ';
                if (group.length > 1) {
                    pathInfo += '[';
                    group.forEach((wavelength, wIndex) => {
                        if (wIndex > 0) pathInfo += ',';
                        pathInfo += `<span style="color:${WAVELENGTH_COLORS[wavelength]}">λ${wavelength}</span>`;
                    });
                    pathInfo += ']';
                } else {
                    pathInfo += `<span style="color:${WAVELENGTH_COLORS[group[0]]}">λ${group[0]}</span>`;
                }
            });
            pathInfo += '</div>';
            
            let pathSteps = [];
            
            path.forEach(step => {
                const parts = step.split(' -> ');
                const fromPart = parts[0];
                const toPart = parts[1].split(' [')[0];
                const statePart = parts[1].indexOf('[') > -1 ? parts[1].split('[')[1].replace(']', '') : '';
                
                // 格式化显示
                let formattedStep = '';
                
                // 处理输入端口
                if (fromPart.startsWith('in-')) {
                    formattedStep = `输入端口 ${fromPart.substring(3)}`;
                } else if (fromPart.includes('-in-')) {
                    const switchInfo = fromPart.split('-in-')[0];
                    const portIdx = fromPart.split('-in-')[1];
                    const layer = switchInfo.split('-')[1];
                    const pos = switchInfo.split('-')[2];
                    formattedStep = `开关 ${parseInt(layer)+1}-${parseInt(pos)+1} 输入端口 ${portIdx}`;
                } else if (fromPart.includes('-out-')) {
                    const switchInfo = fromPart.split('-out-')[0];
                    const portIdx = fromPart.split('-out-')[1];
                    const layer = switchInfo.split('-')[1];
                    const pos = switchInfo.split('-')[2];
                    formattedStep = `开关 ${parseInt(layer)+1}-${parseInt(pos)+1} 输出端口 ${portIdx}`;
                }
                
                formattedStep += ' → ';
                
                // 处理输出端口
                if (toPart.startsWith('out-')) {
                    formattedStep += `输出端口 ${toPart.substring(4)}`;
                } else if (toPart.includes('-in-')) {
                    const switchInfo = toPart.split('-in-')[0];
                    const portIdx = toPart.split('-in-')[1];
                    const layer = switchInfo.split('-')[1];
                    const pos = switchInfo.split('-')[2];
                    formattedStep += `开关 ${parseInt(layer)+1}-${parseInt(pos)+1} 输入端口 ${portIdx}`;
                } else if (toPart.includes('-out-')) {
                    const switchInfo = toPart.split('-out-')[0];
                    const portIdx = toPart.split('-out-')[1];
                    const layer = switchInfo.split('-')[1];
                    const pos = switchInfo.split('-')[2];
                    formattedStep += `开关 ${parseInt(layer)+1}-${parseInt(pos)+1} 输出端口 ${portIdx}`;
                }
                
                // 添加状态信息
                if (statePart) {
                    formattedStep += ` (${statePart.replace('State', '状态')})`;
                }
                
                pathSteps.push(formattedStep);
            });
            
            pathInfo += pathSteps.join('<br>');
            signalPathDisplay.innerHTML = pathInfo;
            
            // 高亮所有相关的端口
            highlightRelevantPorts(path);
            
            // 更新连接关系表
            updateConnectionMapping();
        } else {
            // 显示波长信息但无路径
            let pathInfo = '<strong>信号路径:</strong><br>';
            
            // 添加波长信息
            pathInfo += '<div class="wavelength-path-info">';
            wavelengths.forEach((group, index) => {
                if (index > 0) pathInfo += ', ';
                if (group.length > 1) {
                    pathInfo += '[';
                    group.forEach((wavelength, wIndex) => {
                        if (wIndex > 0) pathInfo += ',';
                        pathInfo += `<span style="color:${WAVELENGTH_COLORS[wavelength]}">λ${wavelength}</span>`;
                    });
                    pathInfo += ']';
                } else {
                    pathInfo += `<span style="color:${WAVELENGTH_COLORS[group[0]]}">λ${group[0]}</span>`;
                }
            });
            pathInfo += '</div>';
            
            pathInfo += '未找到从此端口的有效路径';
            signalPathDisplay.innerHTML = pathInfo;
        }
    }
    
    // 高亮所有相关的端口
    function highlightRelevantPorts(path) {
        // 首先清除所有端口的高亮
        document.querySelectorAll('.switch-port.active').forEach(port => {
            port.classList.remove('active');
        });
        
        // 清除所有连接线的高亮
        document.querySelectorAll('.switch-connection-line.active').forEach(line => {
            line.classList.remove('active');
        });
        
        // 高亮路径中的所有端口
        path.forEach(connection => {
            const parts = connection.split(' -> ');
            const fromId = parts[0];
            const toId = parts[1].split(' [')[0];
            
            // 高亮输入端口
            if (fromId.includes('-in-') || fromId.includes('-out-')) {
                const portElement = document.querySelector(`.switch-port[data-port="${fromId}"]`);
                if (portElement) {
                    portElement.classList.add('active');
                }
            }
            
            // 高亮输出端口
            if (toId.includes('-in-') || toId.includes('-out-')) {
                const portElement = document.querySelector(`.switch-port[data-port="${toId}"]`);
                if (portElement) {
                    portElement.classList.add('active');
                }
            }
            
            // 如果是同一个开关内的连接，高亮内部连接线
            if (fromId.includes('-in-') && toId.includes('-out-') && 
                fromId.split('-in-')[0] === toId.split('-out-')[0]) {
                const switchId = fromId.split('-in-')[0];
                const inPort = fromId.split('-in-')[1];
                const outPort = toId.split('-out-')[1];
                
                const connectionLine = document.querySelector(`.switch-connection-line[data-from="${fromId}"][data-to="${toId}"]`);
                if (connectionLine) {
                    connectionLine.classList.add('active');
                }
            }
        });
        
        // 更新所有连接关系映射
        updateConnectionMapping();
    }

    // 清除活跃的信号路径
    function clearActiveSignalPath() {
        connectionLines.forEach(line => line.classList.remove('active'));
        signalPathDisplay.textContent = '点击输入端口查看信号路径';
    }

    // 获取输出端口索引
    function getOutputPortIndex(inputPortIdx, switchId) {
        const stateId = switchStates[switchId];
        const connections = switchConnections[switchId][stateId];
        return connections[inputPortIdx];
    }

    // 寻找信号路径
    function findSignalPath(inputPort) {
        const path = [];
        let currentPort = inputPort;
        let visitedNodes = new Set();
        
        // 防止循环
        while (!visitedNodes.has(currentPort)) {
            visitedNodes.add(currentPort);
            
            // 找到从当前端口出发的连接
            const nextConnection = findNextConnection(currentPort);
            if (!nextConnection) break;
            
            // 添加到路径并更新当前节点
            path.push(`${currentPort} -> ${nextConnection.to}`);
            currentPort = nextConnection.to;
            
            // 如果是开关输入端口，则根据开关状态确定输出端口
            if (currentPort.includes('-in-')) {
                const parts = currentPort.split('-in-');
                const switchId = parts[0];
                const inPortIdx = parseInt(parts[1]);
                const stateId = switchStates[switchId];
                
                // 获取开关所在层配置，获取正确的端口数
                const layer = parseInt(switchId.split('-')[1]);
                const layerConfig = config.layerConfigs[layer];
                const inputPortsCount = layerConfig.inputPorts;
                
                const stateName = getStateName(stateId, inputPortsCount);
                const outPortIdx = getOutputPortIndex(inPortIdx, switchId);
                
                const outputPort = `${switchId}-out-${outPortIdx}`;
                path.push(`${currentPort} -> ${outputPort} [状态 ${stateId}:${stateName}]`);
                currentPort = outputPort;
            }
            
            // 如果到达输出端口，则结束
            if (currentPort.startsWith('out-')) {
                break;
            }
        }
        
        return path;
    }

    // 寻找下一个连接
    function findNextConnection(fromPortId) {
        for (const line of connectionLines) {
            if (line.dataset.from === fromPortId) {
                return {
                    to: line.dataset.to
                };
            }
        }
        return null;
    }

    // 窗口大小改变时重新绘制连接线
    window.addEventListener('resize', () => {
        drawConnectionLines();
        
        // 如果有活跃的端口，重新显示信号路径
        if (activePort) {
            const portType = activePort.dataset.type || (activePort.dataset.port.startsWith('in-') ? 'in' : 'out');
            if (portType === 'in') {
                showSignalPath(activePort.dataset.port);
            }
        }
    });

    // 显示当前系统所有端口的连接关系
    function updateConnectionMapping() {
        // 计算第一层的总输入端口数
        const firstLayerConfig = config.layerConfigs[0];
        const inputCount = firstLayerConfig ? firstLayerConfig.switchesCount * firstLayerConfig.inputPorts : 0;
        
        // 计算从每个输入到输出的映射
        let inputToOutputMap = {};
        let outputToInputMap = {}; // 新增：输出端口到输入端口的映射
        
        // 对每个可能的输入端口，计算其输出路径
        for (let i = 1; i <= inputCount; i++) {
            const inputPort = `in-${i}`;
            const path = findSignalPath(inputPort);
            
            // 获取波长信息
            const wavelengths = portWavelengths[inputPort] || [[1]];
            let wavelengthHtml = '';
            wavelengths.forEach((group, index) => {
                if (index > 0) wavelengthHtml += ', ';
                if (group.length > 1) {
                    wavelengthHtml += '[';
                    group.forEach((wavelength, wIndex) => {
                        if (wIndex > 0) wavelengthHtml += ',';
                        wavelengthHtml += `<span style="color:${WAVELENGTH_COLORS[wavelength]}">λ${wavelength}</span>`;
                    });
                    wavelengthHtml += ']';
                } else {
                    wavelengthHtml += `<span style="color:${WAVELENGTH_COLORS[group[0]]}">λ${group[0]}</span>`;
                }
            });
            
            // 寻找路径最后一个步骤，应该是到输出端口的
            let outputPort = null;
            let pathDescription = '';
            
            for (let j = path.length - 1; j >= 0; j--) {
                const step = path[j];
                const parts = step.split(' -> ');
                const toPart = parts[1].split(' [')[0];
                
                if (toPart.startsWith('out-')) {
                    outputPort = toPart;
                    
                    // 为路径创建简洁的描述
                    const switchesInPath = [];
                    
                    // 收集路径上所有开关的状态信息
                    for (let k = 0; k < path.length; k++) {
                        if (path[k].includes('[')) {
                            const switchInfo = path[k].split(' -> ')[0].split('-in-')[0];
                            if (switchInfo && switchInfo.startsWith('switch-')) {
                                const layer = switchInfo.split('-')[1];
                                const pos = switchInfo.split('-')[2];
                                const state = path[k].split('[')[1].split(':')[0].replace('状态', 'State');
                                switchesInPath.push(`开关 ${parseInt(layer)+1}-${parseInt(pos)+1}(${state})`);
                            }
                        }
                    }
                    
                    pathDescription = switchesInPath.join(' → ');
                    break;
                }
            }
            
            if (outputPort) {
                const outputNum = parseInt(outputPort.substring(4));
                inputToOutputMap[i] = {
                    output: outputNum,
                    path: pathDescription,
                    wavelengths: wavelengthHtml
                };
                
                // 为输出端口映射保存输入端口信息
                outputToInputMap[outputNum] = {
                    input: i,
                    wavelengths: wavelengthHtml,
                    rawWavelengths: wavelengths
                };
            } else {
                inputToOutputMap[i] = {
                    output: '未连接',
                    path: '',
                    wavelengths: wavelengthHtml
                };
            }
        }
        
        // 更新输出端口的波长显示
        updateOutputPortsWavelength(outputToInputMap);
        
        // 生成所有开关状态的编码
        let allSwitchesStateCode = '';
        for (let layer = 0; layer < config.layers; layer++) {
            const layerConfig = config.layerConfigs[layer];
            for (let pos = 0; pos < layerConfig.switchesCount; pos++) {
                const switchId = `switch-${layer}-${pos}`;
                const stateId = switchStates[switchId] || 0;
                if (allSwitchesStateCode) allSwitchesStateCode += ',';
                allSwitchesStateCode += `${stateId}`;
            }
        }
        
        // 创建更丰富的表格显示连接关系
        let tableHtml = '<table class="connection-table">';
        tableHtml += '<tr><th>输入端口</th><th>波长</th><th>输出端口</th><th>经过开关</th></tr>';
        
        for (let inputNum in inputToOutputMap) {
            const outputInfo = inputToOutputMap[inputNum];
            tableHtml += `<tr>
                <td>输入 ${inputNum}</td>
                <td>${outputInfo.wavelengths}</td>
                <td>${outputInfo.output !== '未连接' ? '输出 ' + outputInfo.output : '未连接'}</td>
                <td>${outputInfo.path || '无'}</td>
            </tr>`;
        }
        
        tableHtml += '</table>';
        
        // 添加系统总体状态编码及网络配置信息
        let configInfo = '<div class="network-config-info"><strong>网络配置:</strong><br>';
        configInfo += `总层数: ${config.layers}<br>层参数:<br>`;
        
        // 添加每层配置信息
        for (let i = 0; i < config.layers; i++) {
            const layerConfig = config.layerConfigs[i];
            configInfo += `层 ${i+1}: ${layerConfig.switchesCount} 个开关, `;
            configInfo += `${layerConfig.inputPorts} 个输入端口, ${layerConfig.outputPorts} 个输出端口<br>`;
        }
        configInfo += '</div>';
        
        connectionMappingDisplay.innerHTML = `
            <strong>当前系统端口连接</strong><br>
            <div class="system-state-code">系统状态码: ${allSwitchesStateCode}</div>
            ${configInfo}
            ${tableHtml}
        `;
    }

    // 更新输出端口的波长显示
    function updateOutputPortsWavelength(outputToInputMap) {
        // 清除所有输出端口的波长显示
        document.querySelectorAll('.outputs .port').forEach(port => {
            // 移除现有的波长信息
            const existingWavelengthInfo = port.querySelector('.wavelength-info');
            if (existingWavelengthInfo) {
                existingWavelengthInfo.remove();
            }
            
            // 移除现有的输入源信息
            const existingInputInfo = port.querySelector('.input-source-info');
            if (existingInputInfo) {
                existingInputInfo.remove();
            }
            
            const portId = port.dataset.port;
            const outputNum = parseInt(portId.split('-')[1]);
            
            // 如果该输出端口有连接的输入
            if (outputToInputMap[outputNum]) {
                const inputInfo = outputToInputMap[outputNum];
                
                // 创建波长信息显示
                const wavelengthInfo = document.createElement('div');
                wavelengthInfo.className = 'wavelength-info';
                wavelengthInfo.innerHTML = inputInfo.wavelengths;
                
                // 添加输入端口信息
                const inputLabel = document.createElement('div');
                inputLabel.className = 'input-source-info';
                inputLabel.textContent = `← 输入 ${inputInfo.input}`;
                
                port.appendChild(wavelengthInfo);
                port.appendChild(inputLabel);
            }
        });
    }

    // 添加连接编辑模式按钮到自定义控制面板
    function initConnectionEditMode() {
        // 检查是否已存在按钮
        if (document.getElementById('connectionEditModeBtn')) {
            return;
        }
        
        // 创建连接编辑模式按钮
        const connectionEditModeBtn = document.createElement('button');
        connectionEditModeBtn.id = 'connectionEditModeBtn';
        connectionEditModeBtn.textContent = '进入连接编辑模式';
        connectionEditModeBtn.className = 'edit-mode-btn';
        
        // 创建连接列表清除按钮
        const clearConnectionsBtn = document.createElement('button');
        clearConnectionsBtn.id = 'clearConnectionsBtn';
        clearConnectionsBtn.textContent = '清除所有自定义连接';
        clearConnectionsBtn.className = 'clear-connections-btn';
        clearConnectionsBtn.style.display = 'none'; // 默认隐藏
        
        // 创建连接编辑控制区
        const connectionEditControls = document.createElement('div');
        connectionEditControls.id = 'connectionEditControls';
        connectionEditControls.className = 'connection-edit-controls';
        
        // 将按钮添加到控制区
        connectionEditControls.appendChild(connectionEditModeBtn);
        connectionEditControls.appendChild(clearConnectionsBtn);
        
        // 将控制区添加到自定义控制面板
        const customControls = document.querySelector('.custom-controls');
        customControls.appendChild(connectionEditControls);
        
        // 添加事件监听器
        connectionEditModeBtn.addEventListener('click', toggleConnectionEditMode);
        clearConnectionsBtn.addEventListener('click', clearAllUserDefinedConnections);
    }
    
    // 切换连接编辑模式
    function toggleConnectionEditMode() {
        isConnectionEditMode = !isConnectionEditMode;
        const connectionEditModeBtn = document.getElementById('connectionEditModeBtn');
        const clearConnectionsBtn = document.getElementById('clearConnectionsBtn');
        
        if (isConnectionEditMode) {
            // 进入编辑模式
            connectionEditModeBtn.textContent = '退出连接编辑模式';
            connectionEditModeBtn.classList.add('active');
            clearConnectionsBtn.style.display = 'inline-block';
            document.body.classList.add('connection-edit-mode');
            
            // 更新提示信息
            signalPathDisplay.innerHTML = '<strong>连接编辑模式</strong><br>请先点击一个输出端口作为连接源，然后点击下一层的输入端口作为目标';
            
            // 重设选择状态
            selectedSourcePort = null;
            if (activePort) {
                activePort.classList.remove('active');
                activePort = null;
            }
            clearActiveSignalPath();
            
            // 为所有开关端口添加编辑模式类
            document.querySelectorAll('.switch-port').forEach(port => {
                port.classList.add('edit-mode');
            });
        } else {
            // 退出编辑模式
            exitConnectionEditMode();
        }
    }
    
    // 退出连接编辑模式
    function exitConnectionEditMode() {
        isConnectionEditMode = false;
        const connectionEditModeBtn = document.getElementById('connectionEditModeBtn');
        const clearConnectionsBtn = document.getElementById('clearConnectionsBtn');
        
        if (connectionEditModeBtn) {
            connectionEditModeBtn.textContent = '进入连接编辑模式';
            connectionEditModeBtn.classList.remove('active');
        }
        
        if (clearConnectionsBtn) {
            clearConnectionsBtn.style.display = 'none';
        }
        
        document.body.classList.remove('connection-edit-mode');
        
        // 恢复默认提示
        signalPathDisplay.textContent = '点击输入端口查看信号路径';
        
        // 重设选择状态
        selectedSourcePort = null;
        if (activePort) {
            activePort.classList.remove('active');
            activePort = null;
        }
        clearActiveSignalPath();
        
        // 移除开关端口的编辑模式类
        document.querySelectorAll('.switch-port').forEach(port => {
            port.classList.remove('edit-mode');
            port.classList.remove('source-selected');
        });
    }
    
    // 清除所有用户自定义连接
    function clearAllUserDefinedConnections() {
        userDefinedConnections = {};
        drawConnectionLines(); // 重新绘制连接线
        
        // 更新提示信息
        signalPathDisplay.innerHTML = '<strong>连接编辑模式</strong><br>已清除所有自定义连接';
        
        // 更新连接关系映射
        updateConnectionMapping();
    }
    
    // 处理端口点击事件 - 连接编辑模式
    function handlePortClickInEditMode(port) {
        const portId = port.dataset.port;
        const portType = port.dataset.type;
        const layerMatch = portId.match(/switch-(\d+)/);
        
        if (!layerMatch) {
            return; // 不是开关端口
        }
        
        const layer = parseInt(layerMatch[1]);
        
        if (!selectedSourcePort) {
            // 第一次点击 - 选择源端口
            if (portType === 'out' && layer < config.layers - 1) {
                // 只有非最后一层的输出端口可以作为源
                selectedSourcePort = port;
                port.classList.add('source-selected');
                
                signalPathDisplay.innerHTML = `<strong>连接编辑模式</strong><br>已选择源端口: ${portId}<br>请选择下一层的输入端口作为目标`;
            } else {
                signalPathDisplay.innerHTML = `<strong>连接编辑模式</strong><br>请选择中间层的输出端口作为源`;
            }
        } else {
            // 第二次点击 - 选择目标端口
            const sourceId = selectedSourcePort.dataset.port;
            const sourceLayer = parseInt(sourceId.match(/switch-(\d+)/)[1]);
            
            if (portType === 'in' && layer === sourceLayer + 1) {
                // 添加连接
                userDefinedConnections[sourceId] = portId;
                
                // 重新绘制连接线
                drawConnectionLines();
                
                // 更新提示信息
                signalPathDisplay.innerHTML = `<strong>连接编辑模式</strong><br>已添加连接: ${sourceId} → ${portId}<br>请继续选择连接源`;
                
                // 更新连接关系映射
                updateConnectionMapping();
                
                // 重置选择状态
                selectedSourcePort.classList.remove('source-selected');
                selectedSourcePort = null;
            } else {
                // 无效的目标选择
                if (portType !== 'in') {
                    signalPathDisplay.innerHTML = `<strong>连接编辑模式</strong><br>目标必须是输入端口`;
                } else if (layer !== sourceLayer + 1) {
                    signalPathDisplay.innerHTML = `<strong>连接编辑模式</strong><br>目标必须是源端口的下一层`;
                }
            }
        }
    }

    // 添加开关端口点击事件
    function initSwitchPortEvents() {
        document.querySelectorAll('.switch-port').forEach(port => {
            port.addEventListener('click', function(e) {
                e.stopPropagation(); // 阻止事件冒泡到开关
                
                // 如果在连接编辑模式中，处理连接编辑
                if (isConnectionEditMode) {
                    handlePortClickInEditMode(this);
                    return;
                }
                
                // 普通模式下的处理
                // 清除之前选中的端口
                if (activePort) {
                    activePort.classList.remove('active');
                    clearActiveSignalPath();
                }
                
                // 设置当前选中的端口
                this.classList.add('active');
                activePort = this;
                
                // 如果是输入端口，显示信号路径
                if (this.dataset.type === 'in') {
                    showSignalPath(this.dataset.port);
                }
                
                // 更新连接关系
                updateConnectionMapping();
            });
        });
    }

    // 初始化后更新连接关系
    updateConnectionMapping();

    // 添加波长选择对话框
    function showWavelengthDialog(portId) {
        // 如果已有对话框，则先移除
        const existingDialog = document.querySelector('.wavelength-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // 获取当前端口的波长信息
        const currentWavelengths = portWavelengths[portId] || [[1]];
        
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.className = 'wavelength-dialog';
        
        // 对话框标题
        const title = document.createElement('div');
        title.className = 'dialog-title';
        title.textContent = `为输入端口 ${portId.split('-')[1]} 设置波长`;
        dialog.appendChild(title);
        
        // 创建波长组列表
        const wavelengthGroups = document.createElement('div');
        wavelengthGroups.className = 'wavelength-groups';
        
        // 获取已使用的波长
        const usedWavelengths = new Set();
        currentWavelengths.forEach(group => {
            group.forEach(wavelength => {
                usedWavelengths.add(wavelength);
            });
        });
        
        // 显示当前波长组
        currentWavelengths.forEach((group, groupIndex) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'wavelength-group';
            
            // 显示组内波长
            const groupContent = document.createElement('div');
            groupContent.className = 'group-content';
            
            let groupHtml = `组 ${groupIndex + 1}: `;
            group.forEach((wavelength, idx) => {
                if (idx > 0) groupHtml += ', ';
                groupHtml += `<span class="wavelength-indicator" style="color:${WAVELENGTH_COLORS[wavelength]}">λ${wavelength}</span>`;
            });
            
            groupContent.innerHTML = groupHtml;
            groupDiv.appendChild(groupContent);
            
            // 删除组按钮
            const deleteGroupBtn = document.createElement('button');
            deleteGroupBtn.textContent = '删除组';
            deleteGroupBtn.className = 'delete-group-btn';
            deleteGroupBtn.addEventListener('click', () => {
                // 从波长数组中删除此组
                const newWavelengths = [...currentWavelengths];
                newWavelengths.splice(groupIndex, 1);
                if (newWavelengths.length === 0) {
                    newWavelengths.push([1]); // 确保至少有一个波长组
                }
                updatePortWavelength(portId, newWavelengths);
                dialog.remove();
                showWavelengthDialog(portId); // 重新显示对话框
            });
            groupDiv.appendChild(deleteGroupBtn);
            
            wavelengthGroups.appendChild(groupDiv);
        });
        
        dialog.appendChild(wavelengthGroups);
        
        // 添加新波长组区域
        const addGroupArea = document.createElement('div');
        addGroupArea.className = 'add-group-area';
        
        const newGroupLabel = document.createElement('div');
        newGroupLabel.textContent = '添加新波长组:';
        addGroupArea.appendChild(newGroupLabel);
        
        // 波长选择列表
        const wavelengthSelector = document.createElement('div');
        wavelengthSelector.className = 'wavelength-selector';
        
        // 创建波长复选框
        const selectedWavelengths = new Set();
        for (let i = 1; i <= MAX_WAVELENGTH; i++) {
            const wavelengthCheckbox = document.createElement('div');
            wavelengthCheckbox.className = 'wavelength-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `wavelength-${i}`;
            checkbox.value = i;
            
            // 如果波长已被使用，禁用复选框
            if (usedWavelengths.has(i)) {
                checkbox.disabled = true;
                wavelengthCheckbox.classList.add('disabled');
            }
            
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedWavelengths.add(i);
                } else {
                    selectedWavelengths.delete(i);
                }
            });
            
            const label = document.createElement('label');
            label.htmlFor = `wavelength-${i}`;
            label.innerHTML = `<span style="color:${WAVELENGTH_COLORS[i]}">λ${i}</span>`;
            
            wavelengthCheckbox.appendChild(checkbox);
            wavelengthCheckbox.appendChild(label);
            wavelengthSelector.appendChild(wavelengthCheckbox);
        }
        
        addGroupArea.appendChild(wavelengthSelector);
        
        // 添加按钮
        const addGroupBtn = document.createElement('button');
        addGroupBtn.textContent = '添加波长组';
        addGroupBtn.className = 'add-group-btn';
        addGroupBtn.addEventListener('click', () => {
            const selectedArray = Array.from(selectedWavelengths).sort((a, b) => a - b);
            if (selectedArray.length > 0) {
                const newWavelengths = [...currentWavelengths, selectedArray];
                updatePortWavelength(portId, newWavelengths);
                dialog.remove();
                showWavelengthDialog(portId); // 重新显示对话框
            }
        });
        
        addGroupArea.appendChild(addGroupBtn);
        dialog.appendChild(addGroupArea);
        
        // 确认按钮
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确认';
        confirmBtn.className = 'confirm-btn';
        confirmBtn.addEventListener('click', () => {
            // 仅关闭对话框，波长信息已经在添加/删除时更新
            dialog.remove();
            
            // 如果有活跃的端口，更新信号路径
            if (activePort && activePort.dataset.port === portId) {
                showSignalPath(portId);
            }
        });
        
        dialog.appendChild(confirmBtn);
        
        // 添加对话框到页面
        document.body.appendChild(dialog);
        
        // 定位对话框
        const portElement = document.querySelector(`.port[data-port="${portId}"]`);
        if (portElement) {
            const portRect = portElement.getBoundingClientRect();
            dialog.style.left = `${portRect.right + 10}px`;
            dialog.style.top = `${portRect.top}px`;
        } else {
            // 默认位置
            dialog.style.left = '20%';
            dialog.style.top = '20%';
        }
    }
    
    // 更新端口波长信息
    function updatePortWavelength(portId, wavelengths) {
        portWavelengths[portId] = wavelengths;
        
        // 更新端口显示
        const portElement = document.querySelector(`.port[data-port="${portId}"]`);
        if (portElement) {
            const wavelengthInfo = portElement.querySelector('.wavelength-info');
            if (wavelengthInfo) {
                let displayHtml = 'λ: ';
                wavelengths.forEach((group, index) => {
                    if (index > 0) displayHtml += '; ';
                    
                    if (group.length > 1) {
                        displayHtml += '[';
                        group.forEach((wavelength, wIndex) => {
                            if (wIndex > 0) displayHtml += ',';
                            displayHtml += `<span style="color:${WAVELENGTH_COLORS[wavelength]}">λ${wavelength}</span>`;
                        });
                        displayHtml += ']';
                    } else {
                        displayHtml += `<span style="color:${WAVELENGTH_COLORS[group[0]]}">λ${group[0]}</span>`;
                    }
                });
                wavelengthInfo.innerHTML = displayHtml;
            }
        }
    }
}); 