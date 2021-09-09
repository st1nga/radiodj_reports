//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//  Listen on a port for web requests for reports, and display them
//---------------------------------------------------------------------------
// Modifications
//===========================================================================
//---------------------------------------------------------------------------

const config = require("config")
const express = require('express');
const mysql = require('mysql');

const cli_args = require('commander');
cli_args.addHelpText('after', `
Here is what the config file should like like in ./config/default.toml

[sql]
username = ""
password = ""
database = ""
host = ""

[report]
logger_name = ""
log_file = ""
listen_host = "0.0.0.0"
port = 888
`);

require('./lib/logit.js')


//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//top 10 played tracks from tx3
//---------------------------------------------------------------------------
function top_10_tx3(db) {
  logger.verbose(ln()+"In top_10_tx3")

  sql = "select songID, title, artist, year, count(*) cnt from history where date_played < DATE_ADD(CURDATE(), INTERVAL -7 day) and user='tx3' and active and song_type=0 group by songID order by cnt desc limit 20;"

  return new Promise((result, reject) => {
    db.query(sql, (error, rows) => {
      if (error) {
        logger.error(ln()+sql);
        reject(error);
      } else {
console.log(rows)
        result(rows)
      }
    });
  });

}
//---------------------------------------------------------------------------

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//MAIN main Main
//---------------------------------------------------------------------------
var active_studio;

cli_args
  .option('--log-to-screen', 'Log output to console')
  .option('--log-file <name>', 'Log filname and path', config.get("report.log_file"))
  .addOption(new cli_args.Option('--log-level <type>', 'Set logging level', 'error').choices(['error', 'verbose', 'info']));

cli_args.parse(process.argv);

logger = create_logger(cli_args);
logger.info(ln()+"Hello World!!")

const db = mysql.createConnection({
  host : config.get("sql.host"),
  user : config.get("sql.username"),
  password : config.get("sql.password"),
  database : config.get("sql.database"),
})

db.connect((err) => {
  if (err) {
    throw(err);
  }
});

const app = express();

app.listen({port: config.get("report.port"), host: config.get("report.listen_host")}, () => {
  logger.info(ln()+"Server is up on port " + config.get("report.port"));
});

app.get('/top_10_tx3', (request, result) => {
  result.end(top_10_tx3(db));
});
