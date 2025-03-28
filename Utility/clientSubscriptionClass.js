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

    /**
     * This is one-one Map to store websocket clients related to a particular user 
     */
    #userClientMap = new Map();

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
    get userClientMap(){
        return this.#userClientMap;
    }
    getUsersFromTicker(tickerName){
        if(!tickerName)
            throw "tickerName is needed to fetch the client Array.";

        return this.#tickerClientsMap.get(tickerName) ? this.#tickerClientsMap.get(tickerName) : [];
    }
    getArrayOfActiveTickers(){
        return Array.from(this.#tickerClientsMap.keys()) || [];
    }
    
    updateClientForUser(userId, client){
        this.#userClientMap.set(userId, client);
    }
    getWebsocketClientForUser(userId){
        return this.#userClientMap.get(userId);
    }
    async clientSubscribesToTicker(tickerName, clientId, token){
        try{
            if(!tickerName || !clientId || !token)
                throw "Missing Parameter";
            if(this.#clientTickerMap.get(clientId)===tickerName)
                return;
            
            // add and modify the client to the ticker it want to subscribe
            this.#tickerClientsMap.set(tickerName, [...(this.#tickerClientsMap.get(tickerName) || []), clientId]);

            if(this.#clientTickerMap.has(clientId))
                this.clientUnsubscribesToTicker(this.#clientTickerMap.get(clientId), clientId)
            
            this.#clientTickerMap.set(clientId, tickerName);      

            await subscribeToTicker(token);
        }catch(err){
            console.log("\nError occured in fn::clientSubscribesToTicker.", err.msg ?? err);
            return null;
        }
    }

    /**
     * check if the client was SUBSCRIBED to a ticker before.
     * If yes, than remove the client from the Client Array corresponding to that Ticker
     * If the Array becomes empty remove the ticker and Unsuscribe to that ticker.
     *  */         
    clientUnsubscribesToTicker(tickerName, client){
        console.log("\nInside fn::clientUnsubscribesToTicker", this.#clientTickerMap.get(client))
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