const p = require('path')
const fs = require('fs-extra')
const { spawnSync } = require('child_process')
const request = require('request-promise-native')
const unzipper = require('unzipper')
const startProgram = function (pathToExe, args, options) {
	if (!args) {
		args = []
	}
	if (!options) {
		options = {shell: true}
	}
	try {
		let child = spawnSync(pathToExe, args, options)
	} catch (err) {
		console.log(err)
	}
}
function Rustkit () {
	this.rustKitDir = __dirname
	this.configFile = this.rustKitDir + '/config.json'
	this.config = {
		// set value for default; set empty value for user obligation
		ownerId: '',
		rconPassword: '',
	}
	if (!fs.existsSync(this.configFile)) {
		fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, '\t'), 'utf8')
		throw 'Please set up your config.json'
	} else {
		let userConfig = JSON.parse(fs.readFileSync(this.configFile, 'utf8'))
		for (option in this.config) {
			if (userConfig[option]) {
				this.config[option] = userConfig[option]
			} else if (!this.config[option]) {
				throw `Set the ${option} option in your config.json`
			}
		}
	}
	this.logsDir = this.rustKitDir + '/logs'
	this.downloadsDir = this.rustKitDir + '/downloads'
	this.dataServerDir = this.rustKitDir + '/data/server'
	let options = {recursive: true}
	if (!fs.existsSync(this.logsDir )) {
		fs.mkdirpSync(this.logsDir, options)
	}
	if (!fs.existsSync(this.downloadsDir)) {
		fs.mkdirpSync(this.downloadsDir, options)
	}
if (!fs.existsSync(this.dataServerDir)) {
		fs.mkdirpSync(this.dataServerDir, options)
}
	//Init End
	this.Server = function (serverRootDir) {
		if (!serverRootDir) {
			throw 'Please set server root directory'
		}
		this.name = p.basename(serverRootDir) 
		this.serverRootDir = serverRootDir
		this.oxidePluginsDir = this.serverRootDir + '/oxide/plugins' 
		this.oxideConfigDir = this.serverRootDir + '/oxide/config'
		if (!fs.existsSync(this.oxidePluginsDir)) {
			fs.mkdirSync(this.oxidePluginsDir, options)
		}
		this.update = function () {
			let installArgs = [
				'+login anonymous',
				'+force_install_dir ' + this.serverRootDir,
				'+app_update 258550',
				'+exit',
			]
			console.log('rust server files are downloading...')
			startProgram('steamcmd', installArgs)
		}
		this.updateOxide = async function () {
			let url = 'https://umod.org/games/rust/download'
			let oxideStream = fs.createWriteStream(this.rkit.downloadsDir + '/oxide.zip')
			let serverData = this.serverRootDir + '/RustDedicated_Data'
			console.log('updating Oxide...')
			await request({
				url,
				mehtod: 'get',
			}).pipe(unzipper.Extract({path: this.rkit.downloadsDir + '/extract'}))
			let oxideData = this.rkit.downloadsDir + '/extract/RustDedicated_Data'   
			fs.copySync(oxideData, serverData, {overwrite: true})
		}
		this.updatePlugin = function (names) {
			let pluginsDir = this.oxidePluginsDir
			if (names[0]){
				names.forEach(async function (name) {
					let url = 'https://umod.org/plugins/' + name + '.cs'
					let target = fs.createWriteStream(pluginsDir + '/' + name + '.cs')
					console.log(`updating ${name}...`)
					await request({
						url,
						method: 'get',
					})
				})
			}
		}
		this.listPlugins = function () {
			if (!fs.existsSync()) {
				console.log('oxide not installed')
			}
			let plugins = fs.readdirSync()
		}
		this.syncPluginConfig = function () {
			let userConfigDir = this.rkit.dataServerDir + '/' + this.name + '/config' 
			if (!fs.existsSync(userConfigDir)) {
				fs.mkdirpSync(userConfigDir)
			}
			if (!fs.existsSync(this.oxideConfigDir)) {
				fs.mkdirpSync(this.oxideConfigDir)
			}
			let copyOptions = {
				overwrite: true,
				filter: (src, dest) => {
					let srcTime = fs.statSync(src).atimeMs 
					let destTime = 0
					if (fs.existsSync(dest)){
						let destTime = fs.statSync(dest).atimeMs
					}
					if (srcTime > destTime) {
						return true
					}
				}
			}
			fs.copySync(this.oxideConfigDir, userConfigDir, copyOptions)
			fs.copySync(userConfigDir, this.oxideConfigDir, copyOptions)
		}
		this.World = function (name) {
			this.worldDir =	this.server.serverRootDir + '/server/' + name
			this.worldCfgDir = this.worldDir + '/cfg'
			if (!fs.existsSync(this.worldCfgDir)){
				fs.mkdirSync(this.worldCfgDir, { recursive: true })
				let message = name + ' server created'
				console.log(message)
			}
			this.setPerm = function (id, perm) {
				let usersCfg =	this.worldCfgDir + '/users.cfg'
				let content = ''
				if (perm == 'ownerid' || perm == 'moderatorid') {
					content = perm + ' ' + id + '"no nick", "no reason"'
					fs.writeFileSync(usersCfg, content, 'utf8')
				} else if (!arguments.length) {
					content = 'ownerid ' + this.rkit.config.ownerId + ' "no nick", "no reason"\n'
					fs.writeFileSync(usersCfg, content, 'utf8')
				} else {
					console.log('no valid permission')
				}
			}
			this.setConfig = function () {
				if (!arguments.length) {
					let serverCfg = fs.readFileSync(this.rkit.rustKitDir + '/templates/server.cfg', 'utf8')
					let cfgEdit = serverCfg.replace(/\$\{rconpassword\}/g, this.rkit.config.rconPassword)
					fs.writeFileSync(this.worldCfgDir + '/server.cfg', cfgEdit, 'utf8')
				}
			}
			this.start = function () {
				let startrustBash = this.server.serverRootDir + '/start_rust.bash'
				let defaultrustBash = this.rkit.rustKitDir + '/templates/start_rust.bash'
				if (!fs.existsSync(startrustBash)) {
					let startScript = fs.readFileSync(defaultrustBash, 'utf8')
					let result = startScript.replace(/\$host/, name)
					fs.writeFileSync(startrustBash, result, {encoding: 'utf8', mode: '770'})
				}
				console.log(`${this.server.name} started - log to ${this.rkit.serverRootDir}/rust.log`)
				startProgram(startrustBash, null, {shell:true, cwd: p.dirname(startrustBash)}) 
			}
		}
		this.World.prototype.rkit = this.rkit
		this.World.prototype.server = this
	}
	this.Server.prototype.rkit = this
}
module.exports = Rustkit
