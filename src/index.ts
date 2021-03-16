import { GithubProxy } from "./GithubProxy";
import JSZip from "jszip";
import fs from "fs";
import path from "path";
import rimraf from "rimraf"
import { promisify } from "util";
import { exec } from "child_process";
import { getLowercaseSpinner } from "./Spinner";
import * as dotenv from "dotenv"
dotenv.config({path: path.resolve(__dirname, "../.env")})

const rmrf = promisify(rimraf);

(async () => {
    const cwd = process.cwd()
    const proxy = new GithubProxy({
        owner: "michael2995",
        repo: "zigbang-client",
        auth: "f351b630395be5204918d62ff52917a1c546a850",
    })

    const recentCommit = await proxy.getRecentCommit()
    // Download repository zip
    const zipBuffer = await proxy.downloadZip(recentCommit.sha)

    // Start unzip
    const unzipSpinner = getLowercaseSpinner("unzipping repository")
    unzipSpinner.start()
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
    unzipSpinner.stop()

    // Start analysis
    const spinner = getLowercaseSpinner("analyzing zuix usage")
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

        // Clean up mess
        const cleanupSpinner = getLowercaseSpinner("cleaning up")
        cleanupSpinner.start()
        rmrf(dirpath)
        cleanupSpinner.stop()
    })

})()