chrome.runtime.onInstalled.addListener((result)=>{
    chrome.storage.sync.get(["geminiApiKey"],(result)=>{
        if (!result.geminiApiKey){
            chrome.tabs.create({url:"options.html"})
        }
    })
})