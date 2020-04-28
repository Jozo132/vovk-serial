// @ts-check
'use strict'

const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')

const millisOffset = +new Date()
const millis = () => +new Date() - millisOffset

const isNumber = n => (n >= 0 || n < 0) && n !== null && !isNaN(n)
const isString = s => typeof s == "string";
const isFunction = f => f && {}.toString.call(f) === '[object Function]'
const isArray = Array.isArray

let SerialList = []
let SerialListError = undefined

const SerialListFunction = () => {
    const change = (l, e) => {
        if (isArray(l)) l = l.filter(item => !item.path.startsWith('/dev/ttyS') && !item.manufacturer.includes('Wireless'))
        if (e) {
            SerialListError = e
            SerialList = l
        } else {
            SerialListError = undefined
            SerialList = l
        }
    }
    SerialPort.list().then(change).catch(e => change([], e))
}
SerialListFunction()
setInterval(SerialListFunction, 250)

class VovkSerial {
    constructor(port, baudrate) {
        this.__local__ = {
            debug: false,
            comPort: port || '',
            baudrate: baudrate || 115200,
            reconnect: false,
            reconnectTime: 1500,
            connecting: false,
            connected: false,
            idle: true,
            connection: undefined,
            inputBuffer: [],
            useBuffer: false,
            timeOfConnection: millis(),
            firstPacket: true,
            lastPacket: '',
            packetsReceived: 0,
            packetsSent: 0,
            error: false,
            errorCount: 0,
            reconnectCount: 0,
            onConnectListener: c => { },
            onReconnectListener: r => { },
            onDisconnectListener: d => { },
            onErrorListener: e => { },
            onReadListener: p => { },
            onWriteListener: p => { },
            parser: new Readline()
        }
        this.__local__.parser.on('data', raw => {
            const diff = millis() - this.__local__.timeOfConnection
            if (diff < 100 && this.__local__.firstPacket) {
                this.__local__.firstPacket = false
                return
            }
            let data = ''
            try {
                if (typeof raw === 'string') data = raw
                else Object.keys(raw).map(k => raw[k]).join(',')
            } catch (e) {
                data = raw
            }
            this.__local__.lastPacket = data
            if (this.__local__.useBuffer) {
                this.__local__.inputBuffer.push(data)
                if (this.__local__.inputBuffer.length > 100) this.__local__.inputBuffer.shift()
            }
            if (!this.__local__.useBuffer && this.__local__.inputBuffer.length > 0) this.__local__.inputBuffer = []

            this.__local__.packetsReceived++
            try {
                this.__local__.onReadListener(data)
            } catch (e) {
                if (this.__local__.debug) console.log(`Serial onRead listener function failure: `, e)
            }
        })
    }
    debug(state) {
        if (state === undefined) return this.__local__.debug
        this.__local__.debug = !!state
        return this.__local__.debug
    }
    list() {
        return SerialList
    }
    port(port, print) {
        if (port) {
            if (this.__local__.connected) return `Can't change port while connected`
            else this.__local__.comPort = port
            if (print) console.log(`Selected port '${this.__local__.comPort}'`)
        }
        return this.__local__.comPort
    }
    baudrate(baud, print) {
        if (baud) {
            if (this.__local__.connected) return `Can't change baudrate while connected`
            else this.__local__.baudrate = baud
            if (print) console.log(`Selected baudrate '${this.__local__.baudrate}'`)
        }
        return this.__local__.baudrate
    }
    begin(port_input, baud_input, onData_callback) {
        if (isString(port_input)) this.__local__.comPort = port_input
        else if (isString(baud_input)) this.__local__.comPort = baud_input
        else if (isString(onData_callback)) this.__local__.comPort = onData_callback

        if (isNumber(+port_input)) this.__local__.baudrate = port_input
        else if (isNumber(+baud_input)) this.__local__.baudrate = baud_input
        else if (isNumber(+onData_callback)) this.__local__.baudrate = onData_callback

        if (isFunction(port_input)) this.onRead(port_input)
        else if (isFunction(baud_input)) this.onRead(baud_input)
        else if (isFunction(onData_callback)) this.onRead(onData_callback)

        const COM = this.__local__.comPort
        const BAUD = this.__local__.baudrate
        this.__local__.reconnect = true
        if (!COM) console.log(`Please select a COM port first!`)
        else if (!BAUD) console.log(`Please select a BAUDRATE first!`)
        else {
            this.__local__.idle = false
            if (!this.__local__.connected && !this.__local__.connecting) {
                this.__local__.connecting = true
                if (this.__local__.debug) console.log(`Connecting to serial: ${COM}`)
                this.__local__.connection = new SerialPort(COM, { baudRate: BAUD })
                this.__local__.connection.pipe(this.__local__.parser)
                let firstConnect = true;
                this.__local__.connection.on('open', () => {
                    this.__local__.timeOfConnection = millis()
                    this.__local__.firstPacket = true;
                    this.__local__.connecting = false;
                    this.__local__.connected = true;
                    this.__local__.error = false;
                    if (firstConnect) {
                        if (this.__local__.debug) console.log(`Device ${COM} connected!`)
                        this.__local__.packetsReceived = 0;
                        this.__local__.packetsSent = 0;
                        try {
                            this.__local__.onConnectListener(true)
                        } catch (e) {
                            if (this.__local__.debug) console.log(`Serial onConnect listener function failure: `, e)
                        }
                    } else {
                        if (this.__local__.debug) console.log(`Device ${COM} reconnected!`)
                        try {
                            this.__local__.onReconnectListener(true)
                        } catch (e) {
                            if (this.__local__.debug) console.log(`Serial onReconnect listener function failure: `, e)
                        }
                    }
                });
                this.__local__.connection.on('close', () => {
                    if (this.__local__.debug) console.log(`Device ${COM} disconnected!`)
                    if (this.__local__.reconnect) {
                        this.__local__.connecting = true
                        setTimeout(() => this.reconnect(), this.__local__.reconnectTime);
                    } else {
                        this.__local__.idle = true
                        this.__local__.connecting = false
                    }
                    this.__local__.connected = false;
                    this.__local__.error = false;
                    try {
                        this.__local__.onDisconnectListener(true)
                    } catch (e) {
                        if (this.__local__.debug) console.log(`Serial onDisconnect listener function failure: `, e)
                    }
                });
                this.__local__.connection.on('error', () => {
                    if (this.__local__.debug) console.log(`Device ${COM} error!`)
                    if (this.__local__.reconnect) {
                        this.__local__.connecting = true
                        setTimeout(() => this.reconnect(), this.__local__.reconnectTime);
                    } else {
                        this.__local__.idle = true
                        this.__local__.connecting = false
                    }
                    this.__local__.connected = false;
                    this.__local__.error = true;
                    this.__local__.errorCount++
                    try {
                        this.__local__.onErrorListener(true)
                    } catch (e) {
                        if (this.__local__.debug) console.log(`Serial onError listener function failure: `, e)
                    }
                })
            } else {
                this.__local__.idle = true
                this.__local__.error = false;
                if (this.__local__.debug) console.log(`Please disconnect serial port before connecting!`)
            }
        }
    }
    onConnect(f) {
        if (f) {
            this.__local__.onConnectListener = f
            return true
        }
        return false
    }
    onReconnect(f) {
        if (f) {
            this.__local__.onReconnectListener = f
            return true
        }
        return false
    }
    onDisconnect(f) {
        if (f) {
            this.__local__.onDisconnectListener = f
            return true
        }
        return false
    }
    onError(f) {
        if (f) {
            this.__local__.onErrorListener = f
            return true
        }
        return false
    }
    connected() { return this.__local__.connected }
    idle() { return this.__local__.idle }
    parseJSON(packet) {
        const decodedString = typeof packet === 'string' ? packet : Object.keys(packet).map(k => packet[k]).join(',')
        let decodedJSON = undefined
        let decodedARRAY = undefined
        try { decodedJSON = JSON.parse(decodedString) } catch (e) { try { decodedARRAY = decodedString.split(/[ ,]+/) } catch (e) { } }
        return decodedARRAY || decodedJSON || decodedString
    }
    info() {
        const output = {
            port: this.__local__.comPort,
            baudrate: this.__local__.baudrate,
            idle: this.__local__.idle,
            connecting: this.__local__.connecting,
            connected: this.__local__.connected,
            error: this.__local__.error,
            errorCount: this.__local__.errorCount,
            reconnectCount: this.__local__.reconnectCount,
            packetsReceived: this.__local__.packetsReceived,
            packetsSent: this.__local__.packetsSent,
            millisOnline: this.__local__.connected ? millis() - this.__local__.timeOfConnection : 0,
        }
        return output
    }
    onRead(f) {
        if (f) {
            this.__local__.useBuffer = false
            this.__local__.onReadListener = f
            return true
        }
        return false
    }
    onWrite(f) {
        if (f) {
            this.__local__.onWriteListener = f
            return true
        }
        return false
    }
    available() {
        this.__local__.useBuffer = true
        return this.__local__.inputBuffer.length > 0
    }
    last() {
        return this.__local__.lastPacket
    }
    read() {
        this.__local__.useBuffer = true
        let output
        if (this.__local__.inputBuffer.length > 0) output = this.__local__.inputBuffer.shift()
        return output
    }
    peek(i) {
        this.__local__.useBuffer = true
        let output
        if (this.__local__.inputBuffer.length > 0) output = this.__local__.inputBuffer[i || 0]
        return output
    }
    print(msg) {
        if (this.__local__.connected) {
            if (this.__local__.debug) console.warn(`Serial out: '${msg}'`);
            try {
                this.__local__.onWriteListener(msg)
            } catch (e) {
                if (this.__local__.debug) console.log(`Serial onWrite listener function failure: `, e)
            }
            this.__local__.connection.write(msg)
            this.__local__.packetsSent++
            return true
        }
        return false
    }
    println(msg) {
        this.print(msg + '\r\n')
    }
    write(msg) {
        this.print(msg)
    }
    reconnect() {
        if (this.__local__.reconnect) {
            this.__local__.reconnectCount++
            this.__local__.idle = false
            if (this.__local__.debug) console.log(`Reconnecting ...`)
            if (!this.__local__.connected) {
                try {
                    this.__local__.connection.open()
                } catch (e) {
                    if (this.__local__.debug) console.log(`Reconnecting failed:`, e)
                }
            }
        }
    }
    reconnecting() { return this.__local__.reconnect }
    reconnectInterval(time) {
        if (time >= 0) this.__local__.reconnectTime = time
        return this.__local__.reconnectTime
    }
    end() {
        if (this.__local__.debug && (this.__local__.connected || this.__local__.connecting)) console.log(`Closing port`)
        this.__local__.reconnect = false
        this.__local__.error = false
        this.__local__.connecting = false
        try {
            this.__local__.connection.close(err => {
                this.__local__.connection = undefined
                this.__local__.connected = false
                this.__local__.idle = true
                this.__local__.inputBuffer = []
                if (this.__local__.debug) console.log('port closed', err)
            });
        } catch (e) {
            this.__local__.connected = false
            this.__local__.idle = true
            this.__local__.inputBuffer = []
        }
    }
}

module.exports = VovkSerial