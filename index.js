"use strict";
const
	os = require("os"),
	express = require("express"),
	sqlite3 = require("sqlite3");

(async()=>
{
	var db, db_err;
	try
	{
		db = await cfgDB('./log.db');
	}
	catch(e)
	{
		db_err = e;
	}

	const app = express();

	app.get("/", (req, res) =>
	{
		res.end("GO AWAY!");
	});
	
	app.get("/log", (req, res) =>
	{
		if (db_err) throw db_err;
		db.run(`INSERT INTO log (timestamp,data) VALUES (${new Date().getTime()},'${req.query.msg.replace(/'/g, "''")}');`, e =>
		{
			if (e) throw e;
			res.json(eq.query.msg);
		});
	});

	app.get("/log.json", (req, res) =>
	{
		db.all("SELECT * FROM log ORDER BY timestamp DESC LIMIT 1000", (e, r) =>
		{
			if (e) throw e;
			res.json(r);
		});
	});

	app.get("/status.json", (req, res) =>
	{
		res.json(
		{
			cpus: os.cpus(),
			freemem: os.freemem(),
			hostname: os.hostname(),
			totalmem: os.totalmem(),
			loadavg: os.loadavg(),
			platform: os.platform(),
			temppath: os.tmpdir(),	// Heroku provides approximatly 620gb
			uptime: os.uptime()
		});
	});

	app.listen(5000, () => console.log("Listening on port 5000 (http)"));

})().catch(console.error);

function cfgDB(strPath)
{
	return new Promise((resolve, reject)=>
	{
		var db = new sqlite3.Database('./log.db', e =>
		{
			if (e) return reject(e);
			db.run("CREATE TABLE IF NOT EXISTS log (timestamp INT, data TEXT);", e =>
			{
				if (e) return reject(e);
				db.run("CREATE INDEX IF NOT EXISTS ix_log_timestamp ON log (timestamp ASC);", e =>
				{
					if (e) return reject(e);
					resolve(db);
				});
			});
		});
	});
}
