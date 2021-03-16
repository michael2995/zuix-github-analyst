import ora from "ora"

export const getLowercaseSpinner = (text: string) => {
    const spinnerText = text.toUpperCase()
    const frames = Array(spinnerText.length)
        .fill(spinnerText)
        .map((str, i) => str.slice(0, i)
        .concat(str[i].toLowerCase())
        .concat(str.slice(i + 1)))    
    const spinner = ora({spinner: { frames }})
    return spinner
}

