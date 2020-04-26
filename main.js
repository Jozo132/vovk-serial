
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
        this._debug = false
        this._comPort = port || ''
        this._baudrate = baudrate || 115200
        this._reconnect = false
        this._reconnectTime = 5000
        this._connecting = false
        this._connected = false
        this._idle = true
        this._connection = undefined
        this._inputBuffer = []
        this._useBuffer = false
        this._timeOfConnection = millis()
        this._firstPacket = true
        this._lastPacket = ''
        this._list = []
        this._onDataListener = ((d) => { })
        this._onListChangeListener = ((d) => { })
        this._parser = new Readline()
        this._parser.on('data', raw => {
            const diff = millis() - this._timeOfConnection
            if (diff < 100 && this._firstPacket) {
                this._firstPacket = false
                return
            }
            let data = ''
            try {
                if (typeof raw === 'string') data = raw
                else Object.keys(raw).map(k => raw[k]).join(',')
            } catch (e) {
                data = raw
            }
            this._lastPacket = data
            if (this._useBuffer) {
                this._inputBuffer.push(data)
                if (this._inputBuffer.length > 100) this._inputBuffer.shift()
            }
            if (!this._useBuffer && this._inputBuffer.length > 0) this._inputBuffer = []
            try {
                this._onDataListener(data)
            } catch (e) {
                if (this._debug) console.log(`Serial listener function failure: `, e)
            }
        })
        this._listInterval = setInterval(() => {
            const change = (l, e) => {
                if (isArray(l)) l = l.filter(item => !item.path.startsWith('/dev/ttyS') && !item.manufacturer.includes('Wireless'))
                if (e) {
                    this._list = l
                    if (this._debug) console.log(e)
                } else {
                    const new_list = JSON.stringify(l)
                    const old_list = JSON.stringify(this._list)
                    this._list = l
                    if (new_list !== old_list)
                        try {
                            this._onListChangeListener(this._list)
                        } catch (e) {
                            if (this._debug) console.log(`Serial list change listener function failure: `, e)
                        }
                }
            }
            SerialPort.list().then(change).catch(e => change([], e))
        }, 1000)
    }
    debug(state) {
        if (state === undefined) return this._debug
        this._debug = !!state
        return this._debug
    }
    list() {
        return this._list
    }
    port(port, print) {
        if (port) {
            if (this._connected) return `Can't change port while connected`
            else this._comPort = port
            if (print) console.log(`Selected port '${this._comPort}'`)
        }
        return this._comPort
    }
    baudrate(baud, print) {
        if (baud) {
            if (this._connected) return `Can't change baudrate while connected`
            else this._baudrate = baud
            if (print) console.log(`Selected baudrate '${this._baudrate}'`)
        }
        return this._baudrate
    }
    begin(port_input, baud_input, onData_callback) {
        if (isString(port_input)) this._comPort = port_input
        else if (isString(baud_input)) this._comPort = baud_input
        else if (isString(onData_callback)) this._comPort = onData_callback

        if (isNumber(+port_input)) this._baudrate = port_input
        else if (isNumber(+baud_input)) this._baudrate = baud_input
        else if (isNumber(+onData_callback)) this._baudrate = onData_callback

        if (isFunction(port_input)) this.onData(port_input)
        else if (isFunction(baud_input)) this.onData(baud_input)
        else if (isFunction(onData_callback)) this.onData(onData_callback)

        const COM = this._comPort
        const BAUD = this._baudrate
        this._reconnect = true
        if (!COM) console.log(`Please select a COM port first!`)
        else if (!BAUD) console.log(`Please select a BAUDRATE first!`)
        else {
            this._idle = false
            if (!this._connected && !this._connecting) {
                this._connecting = true
                if (this._debug) console.log(`Connecting to serial: ${COM}`)
                this._connection = new SerialPort(COM, { baudRate: BAUD })
                this._connection.pipe(this._parser)
                this._connection.on('open', () => {
                    if (this._debug) console.log(`Device ${COM} connected!`)
                    this._timeOfConnection = millis()
                    this._firstPacket = true;
                    this._connecting = false;
                    this._connected = true;
                });
                this._connection.on('close', () => {
                    if (this._debug) console.log(`Device ${COM} disconnected!`)
                    this._connecting = false
                    this._connected = false;
                    if (this._reconnect) {
                        this._connecting = true
                        setTimeout(() => this.reconnect(), this._reconnectTime);
                    } else {
                        this._idle = true
                        this._connecting = false
                    }
                });
                this._connection.on('error', () => {
                    if (this._debug) console.log(`Device ${COM} error!`)
                    this._connected = false;
                    if (this._reconnect) {
                        this._connecting = true
                        setTimeout(() => this.reconnect(), this._reconnectTime);
                    } else {
                        this._idle = true
                        this._connecting = false
                    }
                })
            } else {
                this._idle = true
                if (this._debug) console.log(`Please disconnect serial port before connecting!`)
            }
        }
    }
    connected() { return this._connected }
    idle() { return this._idle }
    parseJSON(packet) {
        const decodedString = typeof packet === 'string' ? packet : Object.keys(packet).map(k => packet[k]).join(',')
        let decodedJSON = undefined
        let decodedARRAY = undefined
        try { decodedJSON = JSON.parse(decodedString) } catch (e) { try { decodedARRAY = decodedString.split(/[ ,]+/) } catch (e) { } }
        return decodedARRAY || decodedJSON || decodedString
    }
    onData(f) {
        if (f) {
            this._useBuffer = false
            this._onDataListener = f
        }
    }
    onListChange(f) { if (f) this._onListChangeListener = f }
    available() {
        this._useBuffer = true
        return this._inputBuffer.length > 0
    }
    last() {
        return this._lastPacket
    }
    read() {
        this._useBuffer = true
        let output
        if (this._inputBuffer.length > 0) output = this._inputBuffer.shift()
        return output
    }
    peek(i) {
        this._useBuffer = true
        let output
        if (this._inputBuffer.length > 0) output = this._inputBuffer[i || 0]
        return output
    }
    print(msg) {
        if (this._connected) {
            if (this._debug) console.warn(`Serial out: '${msg}'`);
            this._connection.write(msg)
        }
    }
    println(msg) {
        this.print(msg + '\r\n')
    }
    write(msg) {
        this.print(msg)
    }
    reconnect() {
        if (this._reconnect) {

            this._idle = false
            if (this._debug) console.log(`Reconnecting ...`)
            if (!this._connected) {
                try {
                    this._connection.open()
                } catch (e) {
                    if (this._debug) console.log(`Reconnecting failed:`, e)
                }
            }
        }
    }
    reconnecting() { return this._reconnect }
    reconnectInterval(time) {
        if (time >= 0) this._reconnectTime = time
        return this._reconnectTime
    }
    end() {
        if (this._debug && (this._connected || this._connecting)) console.log(`Closing port`)
        this._reconnect = false
        this._connecting = false
        try {
            this._connection.close(err => {
                this._connection = undefined
                this._connected = false
                this._idle = true
                this._inputBuffer = []
                if (this._debug) console.log('port closed', err)
            });
        } catch (e) {
            this._connected = false
            this._idle = true
            this._inputBuffer = []
        }
    }
}

module.exports = VovkSerial