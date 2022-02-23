const { app, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const connect = require('connect')
const serveStatic = require('serve-static')

app.whenReady().then(() => {
    const [_, dir] = process.argv
    const folder = dir ? dir : __dirname
    const port = 50000 + Math.floor(Math.random() * 10000)
    const server = connect().use(serveStatic(folder)).listen(port, err => {
        if (err) {
            console.error(err)
            app.quit()
        }
        console.log(`folder ${folder} started on ${port}`);
        
        const addr = server.address()
        const icon = nativeImage.createFromPath(path.resolve(__dirname, 'icon.png'))
        const tray = new Tray(icon)
        const menu = Menu.buildFromTemplate([
            { label: `${folder}`, type: 'normal', enabled: false },
            { label: `${addr.family}://${addr.address}:${addr.port}`, type: 'normal', enabled: false },
            {
                label: `Close and Quit`,
                type: 'normal',
                enabled: true,
                click: () => {
                    server.close(() => {
                        console.log(`folder ${folder} stopped`)
                        tray.destroy()
                        app.quit()
                    })
                }
            },
        ])
        tray.setToolTip('One click to view static website folder')
        tray.setTitle('Static Viewer')
        tray.setContextMenu(menu)
    })
})
