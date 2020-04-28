// @ts-check
'use strict'

const SerialConnection = require('./vovk-serial')

const Serial = new SerialConnection // Create a new serial connection

let port = 'COM3'
let baud = 115200

// #########################################################################
/* CONNECTING to device/port
 * When calling `begin`, the instance qill try to connect to serial port. 
 * On connection loss or any error, it will try to reconnect forever,
 * until connected or Serial.end() is called
**/

// Option 1:
Serial.begin(port, baud) // Start connection with direct port and baudrate input

/*  
    // Option 2: // Recomended if the user is selecting `port` and `baudrate` from 
                 //     a dropdown and clicking connect button to toggle `begin`
    Serial.port(port)       // Choose port     - Default: ''      - will only work if not connected
    Serial.baudrate(baud)   // Choose baudrate - Default: 115200  - will only work if not connected
    Serial.begin()          // Start conenction with predefined input
*/
/*  
    // Option 3:
    Serial.baudrate(baud)   // Choose baudrate - Default: 115200
    Serial.begin(port)      // Start connection with direct port input and predefined baudrate input 
*/

let curentlySelected_port = Serial.port()     // The function call always returns selected port
let curentlySelected_baud = Serial.baudrate() // The function call always returns selected baudrate

// #########################################################################
// #########################################################################
// DISCONNECTING from device/port (planned)
/*
    Serial.end()    // End serial connection, including reconnect calls
*/
// #########################################################################
// #########################################################################
// READING from Serial
// Option 1: - Standard event: Recommended
Serial.onRead(data => {
    console.log(`${Serial.port()}@${Serial.baudrate()} > read:  ${data}`) // Optional logging of received data from serial 
})
// Option 2: - Arduino style / legacy: Not recommended but still works
/* 
    const read = () => {
        if (Serial.available()) {
            const data = Serial.read() // Important: returns whole packet of data, not just characters!!!
            console.log(`${Serial.port()}@${Serial.baudrate()} > read:  ${data}`) // Optional logging of received data from serial 
        }
    }
    setInterval(read, 10) // Check for new data every 10 ms (example) 
*/

// #########################################################################
// #########################################################################
// WRITTING to Serial
Serial.write('test') // Sends 'test' string to Serial device
Serial.print('test') // Sends 'test' string to Serial device (same as `write`)
Serial.println('test') // Sends 'test\r\n' string to Serial (same as `write` but adds carrier return new line at the end of the string)


// #########################################################################
// #########################################################################
// EVENTS
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

// Event triggered when data outgoing - usually not needed
Serial.onWrite(data => {
    console.log(`${Serial.port()}@${Serial.baudrate()} < write: ${data}`) // Display data sent to serial port for debugging
})

// #########################################################################
// #########################################################################
// OPTIONAL SETTINGS
// Use of debug for verbose Serial status output
Serial.debug(false) // Default: false - so this function call is not needed if not used

// Reconnect interval - time in millis between retrying to connect on connection failure
Serial.reconnectInterval(1000) // Default: 1000 ms

// #########################################################################
// #########################################################################
// STATUS, INFO AND DIAGNOSTICS

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
    console.log(`\tconnecting: ${info.connecting}`)
    console.log(`\tconnected: ${info.connected}`)
    console.log(`\terror: ${info.error}`)
    console.log(`\terrorCount: ${info.errorCount}`)
    console.log(`\treconnectCount: ${info.reconnectCount}`)
    console.log(`\tpacketsReceived: ${info.packetsReceived}`)
    console.log(`\tpacketsSent: ${info.packetsSent}`)
    console.log(`\tmillisOnline: ${info.millisOnline}`)
    // Do something with the information, like live status display
}

setInterval(updateSerialStats, 5000) // Loop status update every 5 seconds (example)

// #########################################################################