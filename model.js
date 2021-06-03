
function main(){
    async function init(){
        const model = await tf.loadGraphModel('model.json');
        // const model = await tf.loadLayersModel('model.json');
    }

    init();

    function predict(x, y, z){
        model.predict(tf.tensor([[x, y, z]])).print();
    }
}

main(); 