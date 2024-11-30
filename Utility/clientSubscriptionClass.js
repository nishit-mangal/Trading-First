import { subscribeToTicker, unsubscribeToTicker } from "../handler/websocketHandler.js";

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
    
    async clientSubscribesToTicker(tickerName, clientId){
        if(!tickerName || !clientId)
            throw "Missing Parameter";
        
        // add and modify the client to the ticker it want to subscribe
        this.#tickerClientsMap.set(tickerName, [...(this.#tickerClientsMap.get(tickerName) || []), clientId]);

        if(this.#clientTickerMap.has(clientId))
            this.clientUnsubscribesToTicker(this.#clientTickerMap.get(clientId), clientId)
        
        this.#clientTickerMap.set(clientId, tickerName);      

        await subscribeToTicker();
    }

    /**
     * check if the client was SUBSCRIBED to a ticker before.
     * If yes, than remove the client from the Client Array corresponding to that Ticker
     * If the Array becomes empty remove the ticker and Unsuscribe to that ticker.
     *  */         
    clientUnsubscribesToTicker(tickerName, client){
        console.log(this.#clientTickerMap.get(client))
        if(!tickerName || !client)
            throw "Missing Parameter";     
        
        this.#tickerClientsMap.set(tickerName, this.#tickerClientsMap.get(tickerName)?.filter(c=> c!== client));
        this.#clientTickerMap.delete(client);
        if(this.#tickerClientsMap.get(tickerName).length === 0){
            this.#tickerClientsMap.delete(tickerName);
            unsubscribeToTicker([tickerName], client);
        }
    }
}

export let clientSubscriptionInstance = ClientSubscriptionManager.getInstance();