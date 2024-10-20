class ClientSubscriptionManager{
    static #instance;
    
    /**
     * This is a one to many Map where the key is ticker and the value is array of client.
     */
    #tickerClientsMap = new Map();
    
    /**
     * This is one-one Map to store which Ticker is a particular client is subscribed to.
     */
    #clientTickerMap = new Map();

    constructor() {
        // Private to prevent instantiation from outside
        if (ClientSubscriptionManager.#instance) 
            throw Error("Use Subscription.getInstance() to get the singleton instance")
    }

    static getInstance(){
        if(!ClientSubscriptionManager.#instance)
            ClientSubscriptionManager.#instance = new ClientSubscriptionManager();

        return ClientSubscriptionManager.#instance;
    }

    get tickerClientMap(){
        return this.#tickerClientsMap;
    }
    get clientTickerMap(){
        return this.#clientTickerMap;
    }

    getClientsFromTicker(tickerName){
        if(!tickerName)
            throw "tickerName is needed to fetch the client Array.";

        return this.#tickerClientsMap.get(tickerName) ? this.#tickerClientsMap.get(tickerName) : [];
    }
    getArrayOfActiveTickers(){
        return Array.from(this.#tickerClientsMap.keys()) || [];
    }
    clientSubscribesToTicker(tickerName, clientId){
        if(!tickerName || !clientId)
            throw "Missing Parameter";
        
        // add and modify the client to the ticker it want to subscribe
        this.#tickerClientsMap.set(tickerName, [...(this.#tickerClientsMap.get(tickerName) || []), clientId]);
        if(this.#clientTickerMap.has(clientId)){
            let previousTicker = this.#clientTickerMap.get(clientId);
            this.#tickerClientsMap.set(previousTicker, this.#tickerClientsMap.get(previousTicker)?.filter(c=> c!== clientId));    
            if(this.#tickerClientsMap.get(previousTicker).length === 0)
                this.#tickerClientsMap.delete(previousTicker);    
        }
        this.#clientTickerMap.set(clientId, tickerName);      
    }
}

export let clientSubscriptionInstance = ClientSubscriptionManager.getInstance();