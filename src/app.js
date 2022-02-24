const { app, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const connect = require('connect')
const serveStatic = require('serve-static')

function parseArgv(argv) {
    const _ = argv.shift()
    let cmd = null
    let dir = null
    const unknown = []
    for (let arg of argv) {
        if (arg.startsWith('--squirrel')) cmd = arg
        else if (arg.startsWith('--') || arg.startsWith('-')) unknown.push(arg)
        else dir = arg
    }
    if (unknown.length > 0) {
        console.error(`has unknown argv: ${unknown.join(' ')}`)
    }
    return [cmd, dir]
}

function handleHook(os, cmd) {
    if (os !== 'win32') return false
    if (cmd === null) return false
    
    const {exec, spawn} = require('child_process')
    const reg = function(args, done) {
        exec(`REG ${args.join(' ')}`, {shell: true}, done)
    }
    const update = function(args, done) {
        const command = path.resolve(path.dirname(process.execPath), '..', 'Update.exe')
        spawn(command, args, {detached: true}).on('close', done)
    }
    
    const target = path.basename(process.execPath)
    if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
        reg(['ADD', `"HKLM\\SOFTWARE\\Classes\\Directory\\shell\\StaticViewer"`, '/ve', '/t', 'REG_SZ', '/d', `"Serve with StaticViewer"`, '/f'], err => {
            if (err) console.error(err)
            reg(['ADD', `"HKLM\\SOFTWARE\\Classes\\Directory\\shell\\StaticViewer"`, '/v', 'Icon', '/t', 'REG_SZ', '/d', `"${process.execPath}"`, '/f'], err => {
                if (err) console.error(err)
                reg(['ADD', `"HKLM\\SOFTWARE\\Classes\\Directory\\shell\\StaticViewer\\command"`, '/ve', '/t', 'REG_SZ', '/d', `"\\\"${process.execPath}\\\" \\\"%1\\\""`, '/f'], err => {
                    if (err) console.error(err)
                    update(['--createShortcut=' + target + ''], app.quit)
                })
            })
        })
        return true
    }
    if (cmd === '--squirrel-uninstall') {
        reg(['DELETE', `"HKLM\\SOFTWARE\\Classes\\Directory\\shell\\StaticViewer"`, '/f'], err => {
            if (err) console.error(err)
            update(['--removeShortcut=' + target + ''], app.quit)
        })
        return true
    }
    if (cmd === '--squirrel-obsolete') {
        app.quit()
        return true
    }
    return false
}

app.whenReady().then(() => {
    const [cmd, dir] = parseArgv(process.argv)
    const os = process.platform
    if (handleHook(os, cmd)) return
    
    const folder = dir ? dir : __dirname
    const port = 50000 + Math.floor(Math.random() * 10000)
    const server = connect().use(serveStatic(folder)).listen(port, err => {
        if (err) {
            console.error(err)
            app.quit()
        }
        console.log(`folder ${folder} started on ${port}`)
        
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
