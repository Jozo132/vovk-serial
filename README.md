vovk-serial
===============
Serial wrapper for Node.js

### Overview
This is a Node.JS module, using [`serialport`](https://www.npmjs.com/package/serialport) and [`@serialport/parser-readline`](https://www.npmjs.com/package/@serialport/parser-readline) modules. 
The vision is to largely simplify connecting to serial devices.
This module uses simplified API calls, similar to the [Arduino](https://www.arduino.cc/) [Serial](https://www.arduino.cc/reference/en/language/functions/communication/serial) function.
This module also supports automatic reconnecting on connection loss and some simple live diagnostics (info) for status and debugging.

### Install
Installation is simply done by using NPM:
```sh
npm i vovk-serial
``` 

### Example
Bellow is a quick example of the use of this library:
```js
const SerialConnection = require('vovk-serial')

const Serial = new SerialConnection // Create a new serial connection

let port = 'COM3'
let baud = 115200

// Use of debug for verbose Serial status output
Serial.debug(false) // Default: false - so this function call is not needed if not used


// Serial.begin = Try to connect to serial port. Will try to reconnect forever, even on connection lost or any error, until connected or Serial.end() is called
// Option 1:
Serial.begin(port, baud) // Start connection with direct port and baudrate input
// Option 2:
Serial.port(port) // Choose port - Default: empty
Serial.baudrate(baud) // Choose baudrate - Default: 115200
Serial.begin() // Start conenction with predefined input
// Option 3:
Serial.baudrate(baud) // Choose baudrate - Default: 115200
Serial.begin(port) // Start connection with direct port input and predefined baudrate input


// Event triggered when connected to device
Serial.onConnect(() => {
    console.log(`Serial ${Serial.port()}@${Serial.baudrate()} connected!`)
    Serial.println(`Hello World`) // Sends 'Hello World' to connected serial port when connection is established with carrier return and new line
})

// Event triggered when reconnected to device from an unexpected disconnect
Serial.onReconnect(() => {
    console.log(`Serial ${Serial.port()}@${Serial.baudrate()} reconnected!`)
})

// Event triggered when disconnected from device
Serial.onDisconnect(() => {
    console.log(`Serial ${Serial.port()}@${Serial.baudrate()} disconnected!`)
})

// Event triggered when error triggered from connecting to the device
Serial.onError(() => {
    console.log(`Serial ${Serial.port()}@${Serial.baudrate()} connection ERROR!`)
})


// Event triggered when data incoming - default for reading data
Serial.onRead(packet => {
    console.log(`${Serial.port()}@${Serial.baudrate()} > read:  ${packet}`) // Optional logging of received data from serial 
    Serial.end() // End connection when one packet is received
})

// Event triggered when data outgoing - usually not needed
Serial.onWrite(packet => {
    console.log(`${Serial.port()}@${Serial.baudrate()} < write: ${packet}`) // Display data sent to serial port for debugging
})


const updateSerialStats = () => {
    const port_list = Serial.list() // Shows available serial ports (array of objects)
    console.log(`Available Serial ports (${port_list.length}):`)
    port_list.forEach((item, i) => {
        console.log(`\tPort ${i} info:`)
        console.log(`\t\tpath: ${item.path}`)
        console.log(`\t\tmanufacturer: ${item.manufacturer}`)
        console.log(`\t\tserialNumber: ${item.serialNumber}`)
        console.log(`\t\tpnpId: ${item.pnpId}`)
        console.log(`\t\tvendorId: ${item.vendorId}`)
        console.log(`\t\tproductId: ${item.productId}`)
    })
    // Do something with the port list ...


    const info = Serial.info() // Shows serial info (object)
    console.log(`Serial info:`)
    console.log(`\tport: ${info.port}`)
    console.log(`\tbaudrate: ${info.baudrate}`)
    console.log(`\tidle: ${info.idle}`)
    console.log(`\tconnected: ${info.connected}`)
    console.log(`\terrorCount: ${info.errorCount}`)
    console.log(`\treconnectCount: ${info.reconnectCount}`)
    console.log(`\tpacketsReceived: ${info.packetsReceived}`)
    console.log(`\tpacketsSent: ${info.packetsSent}`)
    console.log(`\tmillisOnline: ${info.millisOnline}`)
    // Do something with the information, like live status display
}

setInterval(updateSerialStats, 5000) // Loop status update every 5 seconds (example)
```
