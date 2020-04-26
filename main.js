
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')


const millisOffset = +new Date()
const millis = () => +new Date() - millisOffset

const isNumber = n => (n >= 0 || n < 0) && n !== null && !isNaN(n)
const isString = s => typeof s == "string";
const isFunction = f => f && {}.toString.call(f) === '[object Function]'
const isArray = Array.isArray

class VovkSerial {
    constructor(port, baudrate) {
        this.__local__ = {
            debug: false,
            comPort: port || '',
            baudrate: baudrate || 115200,
            reconnect: false,
            reconnectTime: 5000,
            connecting: false,
            connected: false,
            idle: true,
            connection: undefined,
            inputBuffer: [],
            useBuffer: false,
            timeOfConnection: millis(),
            firstPacket: true,
            lastPacket: '',
            list: [],
            onDataListener: ((d) => { }),
            onListChangeListener: ((d) => { }),
            listInterval: setInterval(() => {
                const change = (l, e) => {
                    if (isArray(l)) l = l.filter(item => !item.path.startsWith('/dev/ttyS') && !item.manufacturer.includes('Wireless'))
                    if (e) {
                        this.__local__.list = l
                        if (this.__local__.debug) console.log(e)
                    } else {
                        const new_list = JSON.stringify(l)
                        const old_list = JSON.stringify(this.__local__.list)
                        this.__local__.list = l
                        if (new_list !== old_list)
                            try {
                                this.__local__.onListChangeListener(this.__local__.list)
                            } catch (e) {
                                if (this.__local__.debug) console.log(`Serial list change listener function failure: `, e)
                            }
                    }
                }
                SerialPort.list().then(change).catch(e => change([], e))
            }, 1000),
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
            try {
                this.__local__.onDataListener(data)
            } catch (e) {
                if (this.__local__.debug) console.log(`Serial listener function failure: `, e)
            }
        })
    }
    debug(state) {
        if (state === undefined) return this.__local__.debug
        this.__local__.debug = !!state
        return this.__local__.debug
    }
    list() {
        return this.__local__.list
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

        if (isFunction(port_input)) this.onData(port_input)
        else if (isFunction(baud_input)) this.onData(baud_input)
        else if (isFunction(onData_callback)) this.onData(onData_callback)

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
                this.__local__.connection.on('open', () => {
                    if (this.__local__.debug) console.log(`Device ${COM} connected!`)
                    this.__local__.timeOfConnection = millis()
                    this.__local__.firstPacket = true;
                    this.__local__.connecting = false;
                    this.__local__.connected = true;
                });
                this.__local__.connection.on('close', () => {
                    if (this.__local__.debug) console.log(`Device ${COM} disconnected!`)
                    this.__local__.connecting = false
                    this.__local__.connected = false;
                    if (this.__local__.reconnect) {
                        this.__local__.connecting = true
                        setTimeout(() => this.reconnect(), this.__local__.reconnectTime);
                    } else {
                        this.__local__.idle = true
                        this.__local__.connecting = false
                    }
                });
                this.__local__.connection.on('error', () => {
                    if (this.__local__.debug) console.log(`Device ${COM} error!`)
                    this.__local__.connected = false;
                    if (this.__local__.reconnect) {
                        this.__local__.connecting = true
                        setTimeout(() => this.reconnect(), this.__local__.reconnectTime);
                    } else {
                        this.__local__.idle = true
                        this.__local__.connecting = false
                    }
                })
            } else {
                this.__local__.idle = true
                if (this.__local__.debug) console.log(`Please disconnect serial port before connecting!`)
            }
        }
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
    onData(f) {
        if (f) {
            this.__local__.useBuffer = false
            this.__local__.onDataListener = f
        }
    }
    onListChange(f) { if (f) this.__local__.onListChangeListener = f }
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
            this.__local__.connection.write(msg)
        }
    }
    println(msg) {
        this.print(msg + '\r\n')
    }
    write(msg) {
        this.print(msg)
    }
    reconnect() {
        if (this.__local__.reconnect) {

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