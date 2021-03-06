import { GithubProxy } from "./GithubProxy";
import JSZip from "jszip";
import fs from "fs";
import path from "path";
import rimraf from "rimraf"
import { promisify } from "util";
import { exec } from "child_process";
import ora from "ora"
import * as dotenv from "dotenv"
dotenv.config({path: path.resolve(__dirname, "../.env")})

const rmrf = promisify(rimraf);
const spinner = ora();

(async () => {

    const cwd = process.cwd()
    const proxy = new GithubProxy({
        owner: "michael2995",
        repo: "zigbang-client",
        auth: process.env.AUTH as string,
    })

    const recentCommit = await proxy.getRecentCommit()

    // Download repository zip
    const zipBuffer = await proxy.downloadZip(recentCommit.sha)

    // Start unzip
    spinner.text = "unzipping repository";
    spinner.start()
    const unzipped = await JSZip.loadAsync(zipBuffer)
    const filenames = Object.keys(unzipped.files)
    const convertTasks = Object.values(unzipped.files).map((content) => {
        return content.async("nodebuffer")
    });

    const files = await Promise.all(convertTasks)
    const root = filenames[0]
    const tempDir = "__unzipped__temp__zigbang__client"
    const dirpath = path.resolve(cwd, tempDir)

    await rmrf(dirpath)
    fs.mkdirSync(dirpath)

    filenames.forEach((filename, i) => {
        if (unzipped.files[filename].dir
        && !fs.existsSync(path.resolve(dirpath, filename))) {
            fs.mkdirSync(path.resolve(dirpath, filename))
        } else {
            const filepath = path.resolve(dirpath, `./${filename}`);
            fs.writeFileSync(filepath, files[i])
        }
    })
    spinner.stop()

    // Start analysis
    spinner.text = "analyzing zuix usage"
    spinner.start()

    const flags = Object.entries({
        p: `./${tempDir}/${root}/packages`,
        s: process.env.SERVER_ENDPOINT,
    }).map(([flag, value]) => `-${flag} ${value}`)
    .join(" ")
    
    const command = `npx zuix-analyst ${flags}`

    exec(command, (err, stdout, stderr) => {
        if (err) throw err
        if (stderr) throw stderr
        console.log(stdout)
        spinner.stop()

        rmrf(dirpath)
    })
})()