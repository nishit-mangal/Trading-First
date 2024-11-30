export function generateRandomNumber() {
    const min = 100000; // Minimum value
    const max = 999999; // Maximum value

    // Generate a random number between min (inclusive) and max (inclusive)
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    
    return randomNumber;
}