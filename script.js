document.addEventListener('DOMContentLoaded', () => {
    // 全局变量
    const switchNetwork = document.getElementById('switchNetwork');
    const signalPathDisplay = document.getElementById('signalPath');
    const connectionMappingDisplay = document.getElementById('connectionMapping');
    let activePort = null;
    let switchStates = {};  // 存储所有开关的状态
    let switchConnections = {}; // 存储所有开关的连接方式
    let connectionLines = [];  // 存储连接线元素
    
    // 默认配置
    let config = {
        mode: 'default',
        layers: 3,
        switchesPerLayer: 2,
        portsPerSwitch: 2  // 每个开关的端口数（输入和输出各有这么多）
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
            
            if (config.mode === 'default') {
                config.layers = 3;
                config.switchesPerLayer = 2;
                config.portsPerSwitch = 2;
                initNetwork();
            }
        });
    });

    // 应用自定义配置按钮事件监听
    document.getElementById('applyCustomConfig').addEventListener('click', () => {
        const layerCount = parseInt(document.getElementById('layerCount').value);
        const switchPerLayer = parseInt(document.getElementById('switchPerLayer').value);
        const portPerSwitch = parseInt(document.getElementById('portPerSwitch').value);
        
        if (layerCount > 0 && switchPerLayer > 0 && portPerSwitch > 0 && portPerSwitch % 2 === 0) {
            config.layers = layerCount;
            config.switchesPerLayer = switchPerLayer;
            config.portsPerSwitch = portPerSwitch;
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
        
        // 计算输入输出端口数量 (每层开关数 * 每个开关的端口数)
        const portCount = config.switchesPerLayer * config.portsPerSwitch;
        
        // 调整输入输出端口的显示
        adjustPorts('.inputs', portCount, 'in');
        adjustPorts('.outputs', portCount, 'out');
        
        // 创建开关层
        for (let layer = 0; layer < config.layers; layer++) {
            const layerDiv = document.createElement('div');
            layerDiv.className = 'switch-layer';
            layerDiv.dataset.layer = layer;
            
            for (let sw = 0; sw < config.switchesPerLayer; sw++) {
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
                
                // 创建输入端口
                for (let p = 0; p < config.portsPerSwitch; p++) {
                    const inputPort = document.createElement('div');
                    inputPort.className = `switch-port input ${getPortPositionClass(p, config.portsPerSwitch)}`;
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
                
                // 创建输出端口
                for (let p = 0; p < config.portsPerSwitch; p++) {
                    const outputPort = document.createElement('div');
                    outputPort.className = `switch-port output ${getPortPositionClass(p, config.portsPerSwitch)}`;
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
                initSwitchConnections(switchId, stateId);
                
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
                // 清除之前选中的端口
                if (activePort) {
                    activePort.classList.remove('active');
                    clearActiveSignalPath();
                }
                
                // 设置当前选中的端口
                this.classList.add('active');
                activePort = this;
                
                // 如果是输入端口，显示信号路径
                if (this.dataset.port.startsWith('in-')) {
                    showSignalPath(this.dataset.port);
                }
                
                // 更新连接关系
                updateConnectionMapping();
            });
        });
        
        // 添加开关端口点击事件
        document.querySelectorAll('.switch-port').forEach(port => {
            port.addEventListener('click', function(e) {
                e.stopPropagation(); // 阻止事件冒泡到开关
                
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
        
        // 在初始化网络后更新连接关系
        updateConnectionMapping();
    }

    // 初始化开关连接方式
    function initSwitchConnections(switchId, stateId) {
        const portCount = config.portsPerSwitch;
        
        // 创建连接映射
        if (!switchConnections[switchId]) {
            switchConnections[switchId] = {};
        }
        
        // 初始化常见状态（前6种状态）
        const commonStates = Math.min(6, factorial(portCount));
        
        for (let i = 0; i < commonStates; i++) {
            // 为常见状态生成连接配置
            const connections = generateConnectionConfig(i, portCount);
            switchConnections[switchId][i] = connections;
        }
        
        // 确保当前状态已初始化（如果不是常见状态）
        if (stateId >= commonStates && !switchConnections[switchId][stateId]) {
            switchConnections[switchId][stateId] = generateConnectionConfig(stateId, portCount);
        }
    }
    
    // 生成连接配置
    function generateConnectionConfig(stateId, portCount) {
        const connections = {};
        
        if (stateId === 0) {
            // 状态0: 直连模式
            for (let i = 0; i < portCount; i++) {
                connections[i] = i;
            }
        } else if (stateId === 1 && portCount === 2) {
            // 状态1: 2端口交叉模式
            connections[0] = 1;
            connections[1] = 0;
        } else if (stateId === 1 && portCount === 4) {
            // 状态1: 4端口完全交叉模式
            connections[0] = 3;
            connections[1] = 2;
            connections[2] = 1;
            connections[3] = 0;
        } else {
            // 生成排列
            const outputPorts = Array.from({length: portCount}, (_, i) => i);
            const permutation = generatePermutation(outputPorts, stateId);
            
            for (let i = 0; i < portCount; i++) {
                connections[i] = permutation[i];
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
        const portCount = config.portsPerSwitch;
        
        // 确定应该显示的状态数量
        let menuStates;
        if (portCount === 2) {
            menuStates = 2; // 2端口显示2种状态
        } else if (portCount === 4) {
            menuStates = Math.min(24, 12); // 4端口显示12种状态（限制菜单大小）
        } else {
            menuStates = 2; // 默认只显示2种状态
        }
        
        // 创建菜单
        let menuHtml = `<div class="connection-menu-title">Select Connection State</div>`;
        
        for (let i = 0; i < menuStates; i++) {
            // 确保连接配置存在
            if (!switchConnections[switchId][i]) {
                switchConnections[switchId][i] = generateConnectionConfig(i, portCount);
            }
            
            const connections = switchConnections[switchId][i];
            let connectionDesc = '';
            
            // 生成连接描述
            for (let inputPort in connections) {
                connectionDesc += `i${inputPort}→o${connections[inputPort]} `;
            }
            
            const isActive = currentState === i ? 'active' : '';
            menuHtml += `<div class="connection-menu-item ${isActive}" data-state="${i}">
                            State ${i}: ${getStateName(i, portCount)}
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
        if (stateId === 0) return "Bar";
        if (stateId === 1 && portCount === 2) return "Cross";
        if (stateId === 1 && portCount === 4) return "Full Cross";
        
        // 4端口特殊状态名称
        if (portCount === 4) {
            if (stateId === 2) return "Double Cross";
            if (stateId === 3) return "Circular Shift";
            if (stateId === 4) return "Reverse Shift";
            if (stateId === 5) return "Hybrid";
            if (stateId === 6) return "Transform A";
            if (stateId === 12) return "Transform B";
            if (stateId === 18) return "Transform C";
            if (stateId === 23) return "Special";
            return `Permutation #${stateId}`;
        } 
        
        return `State ${stateId}`;
    }
    
    // 更新开关状态显示
    function updateSwitchStateDisplay(switchElem, stateId) {
        const switchId = switchElem.dataset.switch;
        const portCount = config.portsPerSwitch;
        
        // 更新状态标签
        const stateLabel = switchElem.querySelector('.switch-state');
        stateLabel.textContent = `State: ${stateId} (${getStateName(stateId, portCount)})`;
        
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
            const inputY = getPortPosition(inputIdx, portCount) * switchHeight / 100;
            const outputY = getPortPosition(outputIdx, portCount) * switchHeight / 100;
            
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
            portDiv.textContent = `${type === 'in' ? 'Input' : 'Output'} ${i}`;
            portsContainer.appendChild(portDiv);
        }
    }

    // 切换开关状态
    function toggleSwitchState() {
        const switchId = this.dataset.switch;
        const currentState = parseInt(switchStates[switchId]);
        const portCount = config.portsPerSwitch;
        
        // 确定最大状态数
        let maxStates;
        if (portCount === 2) {
            maxStates = 2; // 2端口有2种状态
        } else if (portCount === 4) {
            maxStates = 24; // 4端口有24种状态 (4!)
        } else {
            maxStates = 2; // 默认只有2种状态
        }
        
        // 循环切换到下一个状态
        const newState = (currentState + 1) % maxStates;
        
        // 确保连接配置存在
        if (!switchConnections[switchId][newState]) {
            switchConnections[switchId][newState] = generateConnectionConfig(newState, portCount);
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
        const portCount = config.portsPerSwitch;
        
        let statusMessage = `Switch ${parseInt(layer)+1}-${parseInt(position)+1} state changed to: ${stateId} (${getStateName(stateId, portCount)})`;
        
        // 添加端口连接信息
        statusMessage += '<br>Port connections: ';
        
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
            
            inputs.forEach((input, idx) => {
                const switchIdx = Math.floor(idx / config.portsPerSwitch);
                const portIdx = idx % config.portsPerSwitch;
                
                const targetSwitch = firstLayerSwitches[switchIdx];
                if (targetSwitch) {
                    const targetPort = targetSwitch.querySelector(`.switch-port.input.${getPortPositionClass(portIdx, config.portsPerSwitch)}`);
                    if (targetPort) {
                        const line = createConnectionLine(input, targetPort);
                        connectionLines.push(line);
                    }
                }
            });
            
            // 连接层与层之间的开关端口
            for (let i = 0; i < layers.length - 1; i++) {
                const currentLayer = layers[i];
                const nextLayer = layers[i + 1];
                const currentSwitches = currentLayer.querySelectorAll('.optical-switch');
                const nextSwitches = nextLayer.querySelectorAll('.optical-switch');
                
                currentSwitches.forEach((currentSwitch, switchIdx) => {
                    // 获取当前开关的所有输出端口
                    const outputPorts = currentSwitch.querySelectorAll('.switch-port.output');
                    
                    outputPorts.forEach((outputPort, portIdx) => {
                        // 计算下一层的目标开关和端口
                        const [targetSwitchIdx, targetPortIdx] = calculateNextLayerConnection(switchIdx, portIdx, i);
                        
                        const targetSwitch = nextSwitches[targetSwitchIdx];
                        if (targetSwitch) {
                            const targetPort = targetSwitch.querySelector(`.switch-port.input.${getPortPositionClass(targetPortIdx, config.portsPerSwitch)}`);
                            if (targetPort) {
                                const line = createConnectionLine(outputPort, targetPort);
                                connectionLines.push(line);
                            }
                        }
                    });
                });
            }
            
            // 连接最后一层开关的输出端口到输出端口
            const lastLayer = layers[layers.length - 1];
            const lastLayerSwitches = lastLayer.querySelectorAll('.optical-switch');
            
            lastLayerSwitches.forEach((switchElem, switchIdx) => {
                const outputPorts = switchElem.querySelectorAll('.switch-port.output');
                
                outputPorts.forEach((outputPort, portIdx) => {
                    const outputIdx = switchIdx * config.portsPerSwitch + portIdx;
                    const output = outputs[outputIdx];
                    
                    if (output) {
                        const line = createConnectionLine(outputPort, output);
                        connectionLines.push(line);
                    }
                });
            });
        }
    }

    // 计算下一层的目标开关和端口
    function calculateNextLayerConnection(currentSwitchIdx, outputPortIdx, layerIdx) {
        // 这里实现不同的连接模式
        // 简单实现：对应位置的开关直接相连
        // 可以根据光交换网络的不同拓扑结构调整此函数
        
        // 默认模式：按顺序连接
        const targetSwitchIdx = outputPortIdx % config.switchesPerLayer;
        const targetPortIdx = currentSwitchIdx % config.portsPerSwitch;
        
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
            let pathInfo = '<strong>Signal Path:</strong><br>';
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
                    formattedStep = `Input Port ${fromPart.substring(3)}`;
                } else if (fromPart.includes('-in-')) {
                    const switchInfo = fromPart.split('-in-')[0];
                    const portIdx = fromPart.split('-in-')[1];
                    const layer = switchInfo.split('-')[1];
                    const pos = switchInfo.split('-')[2];
                    formattedStep = `Switch ${parseInt(layer)+1}-${parseInt(pos)+1} Input Port ${portIdx}`;
                } else if (fromPart.includes('-out-')) {
                    const switchInfo = fromPart.split('-out-')[0];
                    const portIdx = fromPart.split('-out-')[1];
                    const layer = switchInfo.split('-')[1];
                    const pos = switchInfo.split('-')[2];
                    formattedStep = `Switch ${parseInt(layer)+1}-${parseInt(pos)+1} Output Port ${portIdx}`;
                }
                
                formattedStep += ' → ';
                
                // 处理输出端口
                if (toPart.startsWith('out-')) {
                    formattedStep += `Output Port ${toPart.substring(4)}`;
                } else if (toPart.includes('-in-')) {
                    const switchInfo = toPart.split('-in-')[0];
                    const portIdx = toPart.split('-in-')[1];
                    const layer = switchInfo.split('-')[1];
                    const pos = switchInfo.split('-')[2];
                    formattedStep += `Switch ${parseInt(layer)+1}-${parseInt(pos)+1} Input Port ${portIdx}`;
                } else if (toPart.includes('-out-')) {
                    const switchInfo = toPart.split('-out-')[0];
                    const portIdx = toPart.split('-out-')[1];
                    const layer = switchInfo.split('-')[1];
                    const pos = switchInfo.split('-')[2];
                    formattedStep += `Switch ${parseInt(layer)+1}-${parseInt(pos)+1} Output Port ${portIdx}`;
                }
                
                // 添加状态信息
                if (statePart) {
                    formattedStep += ` (${statePart.replace('状态', 'State')})`;
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
            signalPathDisplay.textContent = `No valid path found from ${inputPort}`;
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
        signalPathDisplay.textContent = 'Click on an input port to view the signal path';
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
                const stateName = getStateName(stateId, config.portsPerSwitch);
                const outPortIdx = getOutputPortIndex(inPortIdx, switchId);
                
                const outputPort = `${switchId}-out-${outPortIdx}`;
                path.push(`${currentPort} -> ${outputPort} [State ${stateId}:${stateName}]`);
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
        const inputCount = config.switchesPerLayer * config.portsPerSwitch;
        
        // 计算从每个输入到输出的映射
        let inputToOutputMap = {};
        
        // 对每个可能的输入端口，计算其输出路径
        for (let i = 1; i <= inputCount; i++) {
            const inputPort = `in-${i}`;
            const path = findSignalPath(inputPort);
            
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
                                switchesInPath.push(`Switch ${parseInt(layer)+1}-${parseInt(pos)+1}(${state})`);
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
                    path: pathDescription
                };
            } else {
                inputToOutputMap[i] = {
                    output: 'Not Connected',
                    path: ''
                };
            }
        }
        
        // 生成所有开关状态的编码
        let allSwitchesStateCode = '';
        for (let layer = 0; layer < config.layers; layer++) {
            for (let pos = 0; pos < config.switchesPerLayer; pos++) {
                const switchId = `switch-${layer}-${pos}`;
                const stateId = switchStates[switchId] || 0;
                if (allSwitchesStateCode) allSwitchesStateCode += ',';
                allSwitchesStateCode += `${stateId}`;
            }
        }
        
        // 创建更丰富的表格显示连接关系
        let tableHtml = '<table class="connection-table">';
        tableHtml += '<tr><th>Input Port</th><th>Output Port</th><th>Via Switches</th></tr>';
        
        for (let inputNum in inputToOutputMap) {
            const outputInfo = inputToOutputMap[inputNum];
            tableHtml += `<tr>
                <td>Input ${inputNum}</td>
                <td>${outputInfo.output !== 'Not Connected' ? 'Output ' + outputInfo.output : 'Not Connected'}</td>
                <td>${outputInfo.path || 'None'}</td>
            </tr>`;
        }
        
        tableHtml += '</table>';
        
        // 添加系统总体状态编码
        connectionMappingDisplay.innerHTML = `
            <strong>Current System Port Connections</strong><br>
            <div class="system-state-code">System State Code: ${allSwitchesStateCode}</div>
            ${tableHtml}
        `;
    }

    // 初始化后更新连接关系
    updateConnectionMapping();
}); 