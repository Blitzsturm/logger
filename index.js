"use strict";
const
	fs = require("fs"),
	os = require("os"),
	express = require("express"),
	sqlite3 = require("sqlite3");
Main().catch(console.error);

async function Main()
{
	if (!process.env.PORT) process.env.PORT = 5000;
	if (!process.env.DB_PATH) process.env.DB_PATH = './log.db';

	var db, db_err, esc = s => "'" + s.replace(/'/g, "''") + "'";
	try
	{
		db = await cfgDB(process.env.DB_PATH);
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

	app.get("/api/log", (req, res) =>
	{
		if (db_err) throw db_err;
		if (req.query.key)
		{
			db.all(`
				SELECT l.time, l.data
				FROM log l LEFT JOIN keys k ON l.keyid = k.id
				WHERE k.key = ${esc(req.query.key)}
				ORDER BY l.time DESC
				LIMIT 1000
			`, (e, r) =>
			{
				if (e) throw e;
				res.json(r);
			});
		}
		else
		{
			db.all(`
				SELECT l.time, l.data
				FROM log l
				WHERE l.keyid IS NULL
				ORDER BY l.time DESC
				LIMIT 1000
			`, (e, r) =>
			{
				if (e) throw e;
				res.json(r);
			});
		}
	});

	app.get("/api/write", (req, res) =>
	{
		if (db_err) throw db_err;
		var row = {time: new Date().getTime(), data: req.query.msg};
		if (req.query.key)
		{
			db.exec(`
				INSERT OR IGNORE INTO keys (key) VALUES (${esc(req.query.key)});
				INSERT INTO log (time, keyid, data) VALUES (${row.time}, (SELECT id FROM keys WHERE key = ${esc(req.query.key)}), ${esc(row.data)});
			`, e =>
			{
				if (e) throw e;
				res.json(row);
			});
		}
		else
		{
			db.exec(`INSERT INTO log (time,data) VALUES (${row.time},${esc(row.data)});`, e =>
			{
				if (e) throw e;
				res.json(row);
			});
		}
	});

	app.get("/api/delete", (req, res) =>
	{
		if (db_err) throw db_err;
		if (req.query.key)
		{
			db.exec(`DELETE FROM keys WHERE key = ${esc(req.query.key)}; VACUUM;`, e =>
			{
				if (e) throw e;
				res.json({status:"success"});
			});
		}
		else
		{
			res.json({status:"failure", message: "no key provided"});
		}
	});

	app.get("/api/status", (req, res) =>
	{
		fs.stat(process.env.DB_PATH, (e, s) =>
		{
			res.json(
			{
				dbSize: e ? 0 : s.size,
				cpus: os.cpus(),
				freemem: os.freemem(),
				hostname: os.hostname(),
				totalmem: os.totalmem(),
				loadavg: os.loadavg(),
				platform: os.platform(),
				temppath: os.tmpdir(),
				uptime: os.uptime()
			});
		});
	});

	app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT} (http)`));
}

function cfgDB(strPath)
{
	return new Promise((resolve, reject) =>
	{
		var db = new sqlite3.Database(strPath, e => e ? reject(e) : db.exec(`
			CREATE TABLE IF NOT EXISTS keys
			(
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				key TEXT UNIQUE
			);
			CREATE TABLE IF NOT EXISTS log
			(
				time INTEGER,
				keyid INTEGER,
				data TEXT,
				FOREIGN KEY (keyid) REFERENCES keys(id) ON DELETE CASCADE
			);
			CREATE INDEX IF NOT EXISTS ix_log_time ON log (time DESC);
		`, e => e ? reject(e) : resolve(db)));
	});
}
