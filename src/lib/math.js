export function gcd(a,b) {
    a = Math.abs(a);
    b = Math.abs(b);
    if (b > a) {var temp = a; a = b; b = temp;}
    while (true) {
        if (b === 0) return a;
        a %= b;
        if (a === 0) return b;
        b %= a;
    }
}

export function park_miller_prng(seed){
    // Park-miller PRNG using a chosen prime and primitive root
    let p = 38173840833600902789;
    let r = 19086920416800451394;
    let state = Math.floor(seed*p);
    let random_integer = function(max){
        state = (r*state)%p;
        return Math.floor(state/(p/max+1));
    }
    return random_integer;
}

export function random_seed(){
    return Math.floor(Math.random()*38173840833600902789);
}

export function seeded_shuffle(array, seed) {
    if (typeof seed === 'undefined'){
        seed = random_seed();
    }
    let rand_int = park_miller_prng(seed);
    let new_array = array.slice();
    for (let i = array.length-1; i > 0; i--) {
        let j = rand_int(i+1);
        let temp = new_array[j];
        new_array[j] = new_array[i];
        new_array[i] = temp; 
    }
    return new_array;
}

export function seeded_derangement(array, seed) {
    if (typeof seed === 'undefined'){
        seed = random_seed();
    }
    let rand_int = park_miller_prng(seed);
    let new_array = array.slice();
    for (let i = array.length-1; i > 0; i--) {
        let j = rand_int(i);
        let temp = new_array[j];
        new_array[j] = new_array[i];
        new_array[i] = temp; 
    }
    return new_array;
}