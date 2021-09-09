const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;
const strftime = require("strftime");
const path = require("path");
const process = require("process")

local_timestamp = () => strftime('%F %T');
const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} ${level} ${message}`;
});

ln = () => {

    junk = (new Error().stack.split("at ")[2]).trim();
    if (junk.includes('(')) {
        junk = junk.split(/^.*\((.*):(.*):.*$/)
        filename = path.parse(junk[1]).name;
        line_no = junk[2];
   } else {
        junk = junk.split(/^(.*):(.*):.*$/);
        filename = path.parse(junk[1]).name;
        line_no = junk[2];
    }
    pid = process.pid;
    return `[${pid}-${filename}:${line_no}] `;
}

create_logger = (cli_args) => {
    logger = createLogger({
        level: cli_args.opts().logLevel,
        format: combine(
            timestamp({format: local_timestamp}),
            myFormat
        ),
        defaultMeta: { service: 'user-service' },
        transports: [
            new transports.File({ filename: cli_args.opts().logFile}),
        ],
    });

    if (cli_args.opts().logToScreen) {
        logger.add(new transports.Console({}));
    };

    return logger;
};

module.exports = create_logger, ln;
