const { app, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const connect = require('connect')
const serveStatic = require('serve-static')

function parseArgv(argv) {
    const exe = argv.shift()
    let cmd = null
    let dir = null
    const unknown = [];
    for (let arg of argv) {
        if (arg.startsWith('--squirrel')) cmd = arg
        else if (arg.startsWith('--') || arg.startsWith('-')) unknown.push(arg)
        else dir = arg
    }
    if (unknown.length > 0) {
        console.error(`has unknown argv: ${unknown.join(' ')}`)
    }
    return [exe, cmd, dir]
}

function handleHook(os, exe, cmd) {
    if (os !== 'win32') return false
    if (cmd === null) return false
    
    const ChildProcess = require('child_process')
    const appFolder = path.resolve(exe, '..');
    const rootFolder = path.resolve(appFolder, '..');
    const updateExe = path.resolve(path.join(rootFolder, 'Update.exe'));
    const exeName = path.basename(exe);
    
    const spawn = function(command, args) {
        let spawnedProcess, error;
        
        try {
            spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
        } catch (error) {}
        
        return spawnedProcess;
    };
    
    const spawnUpdate = function(args) {
        return spawn(updateExe, args);
    };
    
    switch (cmd) {
        case '--squirrel-install':
        case '--squirrel-updated':
        spawnUpdate(['--createShortcut', exeName])
        app.quit()
        return true
        case '--squirrel-uninstall':
        spawnUpdate(['--removeShortcut', exeName])
        app.quit()
        return true
        case '--squirrel-obsolete':
        app.quit()
        return true
    }
    return false
}

app.whenReady().then(() => {
    const [exe, cmd, dir] = parseArgv(process.argv)
    const os = process.platform
    if (handleHook(os, exe, cmd)) return
    
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
