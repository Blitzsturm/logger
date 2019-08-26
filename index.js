"use strict";
const
	os = require("os"),
	express = require("express"),
	sqlite3 = require("sqlite3");
Main().catch(console.error);

async function Main()
{
	if (!process.env.PORT) process.env.PORT = 5000;
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

	app.use("/", express.static("public",
	{
		//extensions: ["htm", "html"],
		index: "index.htm"
	}));
	
	app.get("/log", (req, res) =>
	{
		if (db_err) throw db_err;
		var row = {timestamp: new Date().getTime(), data: req.query.msg};
		db.run(`INSERT INTO log (timestamp,data) VALUES (${row.timestamp},'${row.data.replace(/'/g, "''")}');`, e =>
		{
			if (e) throw e;
			res.json(row);
		});
	});

	app.get("/log.json", (req, res) =>
	{
		if (db_err) throw db_err;
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

	app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT} (http)`));
}

function cfgDB(strPath)
{
	return new Promise((resolve, reject) =>
	{
		var db = new sqlite3.Database(strPath, e => e ? reject(e) : db.exec(`
			CREATE TABLE IF NOT EXISTS log
			(
				timestamp INT,
				data TEXT
			);
			CREATE INDEX IF NOT EXISTS ix_log_timestamp ON log (timestamp DESC);
		`, e => e ? reject(e) : resolve(db)));
	});
}
