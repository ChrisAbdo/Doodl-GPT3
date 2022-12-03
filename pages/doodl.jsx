import { useState, createRef, useEffect } from 'react';
import CanvasDraw from 'react-canvas-draw';
import { ChromePicker } from 'react-color';
import toast, { Toaster } from 'react-hot-toast';

import Marketplace from '../backend/build/contracts/Marketplace.json';
import NFT from '../backend/build/contracts/NFT.json';
import Web3 from 'web3';
import { create as ipfsHttpClient } from 'ipfs-http-client';

const Draw = () => {
  // State for the color, dimensions, and brush and lazy radii
  const [color, setColor] = useState('black');
  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(500);
  const [brushRadius, setBrushRadius] = useState(3);
  const [lazyRadius, setLazyRadius] = useState(0);

  // IPFS States
  const ipfsClient = require('ipfs-http-client');
  const projectId = '2FdliMGfWHQCzVYTtFlGQsknZvb';
  const projectSecret = '2274a79139ff6fdb2f016d12f713dca1';
  const auth =
    'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
  const client = ipfsHttpClient({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: auth,
    },
  });
  const IPFSGateway = 'https://ipfs.io/ipfs/';

  const [account, setAccount] = useState();
  const [price, setPrice] = useState(1);
  const [nfts, setNfts] = useState([]);

  // State for the timer
  const [timer, setTimer] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);

  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const [fileUrl, setFileUrl] = useState(null);
  const [formInput, updateFormInput] = useState({
    name: account,

    price: price,
  });

  // Ref for the CanvasDraw component
  const saveableCanvas = createRef();

  useEffect(() => {
    // Call getPromptAndTime on mount
    getPromptAndTime();
    loadBlockchainData();

    updateFormInput((formInput) => ({ ...formInput, name: account }));
    updateFormInput((formInput) => ({ ...formInput, price: price }));
  }, [account]);

  const loadBlockchainData = async () => {
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);
    } catch (err) {
      console.log(err);
    }
  };

  async function getPromptAndTime() {
    const web3 = new Web3(window.ethereum);
    const networkId = await web3.eth.net.getId();

    // Mint the NFT
    const NFTContractAddress = NFT.networks[networkId].address;
    const NFTContract = new web3.eth.Contract(NFT.abi, NFTContractAddress);
    const accounts = await web3.eth.getAccounts();
    const marketPlaceContract = new web3.eth.Contract(
      Marketplace.abi,
      Marketplace.networks[networkId].address
    );
    const prompt = await marketPlaceContract.methods.getPrompt().call();
    setPrompt(prompt);
    const time = await marketPlaceContract.methods.getTimeLeft().call();
    // convert the time to hours minutes and seconds
    // const minutes = Math.floor(time / 60);
    // setTimer(minutes);
    const hours = Math.floor(time / 3600);
    setHours(hours);
    const minutes = Math.floor((time % 3600) / 60);
    setMinutes(minutes);

    setTimer(hours * 60 + minutes);

    // force this component to re-render every minute without refreshing the page
    setTimeout(() => {
      getPromptAndTime();
    }, 60000);

    // console log it in a readable format
    console.log(`Prompt: ${prompt}\nTime: ${time}`);
    return prompt;
  }

  async function onChange(e) {
    const canvas = saveableCanvas.current.getDataURL();
    // turn the canvas into a blob and image
    console.log(canvas);
    // const image = canvas.toDataURL('image/png');
    // const blob = await fetch(image).then((r) => r.blob());
    // const file = new File([blob], 'image.png', { type: 'image/png' });
    const image = canvas;
    const blob = await fetch(image).then((r) => r.blob());
    const file = new File([blob], 'image.png', { type: 'image/png' });
    try {
      const added = await client.add(file, {
        progress: (prog) => console.log(`received: ${prog}`),
      });
      const url = `${IPFSGateway}${added.path}`;
      setFileUrl(url);
      console.log('url', url);
    } catch (error) {
      console.log('Error uploading file: ', error);
    }
  }

  async function uploadToIPFS() {
    const { name, price } = formInput;
    if (!name || !price || !fileUrl) {
      return;
    } else {
      // first, upload metadata to IPFS
      const data = JSON.stringify({
        name,
        price,
        image: fileUrl,
      });
      try {
        const added = await client.add(data);
        const url = `https://ipfs.io/ipfs/${added.path}`;
        // after metadata is uploaded to IPFS, return the URL to use it in the transaction
        return url;
      } catch (error) {
        console.log('Error uploading file: ', error);
      }
    }
  }

  async function listNFTForSale() {
    // Check if the user has already listed an NFT for sale

    const notification = toast.loading(
      'Please confirm both transactions to create doodl...',
      {
        style: {
          border: '2px solid #000',
        },
      }
    );

    try {
      const web3 = new Web3(window.ethereum);
      const provider = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      const url = await uploadToIPFS();
      const networkId = await web3.eth.net.getId();

      // Mint the NFT
      const NFTContractAddress = NFT.networks[networkId].address;
      const NFTContract = new web3.eth.Contract(NFT.abi, NFTContractAddress);
      const accounts = await web3.eth.getAccounts();
      const marketPlaceContract = new web3.eth.Contract(
        Marketplace.abi,
        Marketplace.networks[networkId].address
      );

      let listingFee = await marketPlaceContract.methods.getListingFee().call();
      listingFee = listingFee.toString();
      NFTContract.methods
        .mint(url)
        .send({ from: accounts[0] })
        .on('receipt', function (receipt) {
          console.log('minted');
          // List the NFT
          const tokenId = receipt.events.NFTMinted.returnValues[0];
          marketPlaceContract.methods
            .listNft(
              NFTContractAddress,
              tokenId,
              Web3.utils.toWei(formInput.price, 'ether')
            )
            .send({ from: accounts[0], value: listingFee })
            .on('receipt', function () {
              console.log('listed');
              toast.success('doodl listed successfully!', {
                id: notification,
                style: {
                  border: '2px solid #000',
                },
              });
              setTimeout(() => {
                // take the user to the / page
                window.location.href = '/vote';
              }, 3000);
            });
        });
    } catch (err) {
      console.log(err);
      toast.error('Error listing doodl', {
        id: notification,
        style: {
          border: '2px solid #000',
        },
      });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-center ">
        <div className=" rounded overflow-hidden shadow-lg border border-primary">
          <div className="px-6 py-4 text-center">
            <h1 className=" text-xl mb-2 ">Prompt:</h1>
            <h1 className="font-bold text-xl mb-6">{prompt}</h1>
            <h1 className=" text-xl mb-2">Time Remaining:</h1>
            <div className="grid grid-flow-col gap-5 text-center auto-cols-max">
              <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
                <span className="countdown font-mono text-5xl">
                  <span style={{ '--value': days }}></span>
                </span>
                days
              </div>
              <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
                <span className="countdown font-mono text-5xl">
                  <span style={{ '--value': hours }}></span>
                </span>
                hours
              </div>
              <div className="flex flex-col p-2 bg-neutral rounded-box text-neutral-content">
                <span className="countdown font-mono text-5xl">
                  <span style={{ '--value': minutes }}></span>
                </span>
                minutes
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between px-20 mt-20 items-center border border-black mb-8">
        <button
          onClick={() => {
            toast.success('Cleared!', {
              style: {
                borderRadius: '2px',
                border: '2px solid #000',
              },
            });
            saveableCanvas.current.eraseAll();
          }}
          className="btn btn-outline gap-2"
        >
          Erase
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>

        <button
          onClick={() => {
            toast.success('Undone!', {
              style: {
                borderRadius: '2px',
                border: '2px solid #000',
              },
            });
            saveableCanvas.current.undo();
          }}
          className="btn gap-2"
        >
          Undo
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
            />
          </svg>
        </button>

        <label>
          brush size&nbsp;
          <input
            type="number"
            min="0"
            max="100"
            value={brushRadius}
            className="input input-bordered w-20"
            onChange={(e) => setBrushRadius(parseInt(e.target.value, 10))}
          />
        </label>

        <label>
          lazy radius&nbsp;
          <input
            type="number"
            value={lazyRadius}
            className="input input-bordered w-20"
            onChange={(e) => setLazyRadius(parseInt(e.target.value, 10))}
          />
        </label>
        {/* Add the ChromePicker component here */}
        <ChromePicker
          color={color}
          onChange={(newColor) => setColor(newColor.hex)}
        />
      </div>

      <div className="flex justify-center">
        <CanvasDraw
          ref={saveableCanvas}
          brushColor={color}
          brushRadius={brushRadius}
          lazyRadius={lazyRadius}
          canvasWidth={width}
          canvasHeight={height}
          // chnange the dot color
          catenaryColor={color}
          className="border border-black"
          id="canvas"
        />
      </div>

      <div className="flex justify-center mt-10 text-center">
        <label
          htmlFor="my-modal-6"
          onClick={onChange}
          className="relative inline-block px-4 py-2 font-medium group cursor-pointer text-center w-1/2"
        >
          <span className="absolute inset-0 w-full h-full transition duration-200 ease-out transform translate-x-1 translate-y-1 bg-[#77dd77] border-black border-[2px] group-hover:-translate-x-0 group-hover:-translate-y-0"></span>
          <span className="absolute inset-0 w-full h-full bg-white border-2 border-black group-hover:bg-[#77dd77]"></span>
          <span className="relative text-black group-hover:text-black">
            submit
          </span>
        </label>
      </div>

      <Toaster />
      <input type="checkbox" id="my-modal-6" className="modal-toggle" />
      <div className="modal modal-bottom sm:modal-middle bg-white">
        <div className="modal-box">
          <div className="flex flex-col gap-2">
            <label htmlFor="price">
              please confirm the following to receive your funds if you win:
              {/* span red asterisk */}
              <span className="text-red-500">*</span>
            </label>

            <input
              placeholder="price for others to mint in MATIC if you win :)"
              // require it to say 5
              required
              className="mt-2 border rounded p-4 input input-bordered"
              onChange={(e) =>
                updateFormInput({ ...formInput, price: e.target.value })
              }
            />
            <label className="text-center" htmlFor="price">
              <span className="text-red-500">Warning!</span> Sometimes the
              drawing takes a second to upload. If you get an error, please try
              again in a few seconds!
            </label>

            <label className="text-center" htmlFor="price">
              BE ALERT: ALL DOODLS WILL BE VERIFIED.
            </label>

            <div
              onClick={listNFTForSale}
              className="relative inline-block px-4 py-2 font-medium group cursor-pointer text-center "
            >
              <span className="absolute inset-0 w-full h-full transition duration-200 ease-out transform translate-x-1 translate-y-1 bg-[#77dd77] border-black border-[2px] group-hover:-translate-x-0 group-hover:-translate-y-0"></span>
              <span className="absolute inset-0 w-full h-full bg-white border-2 border-black group-hover:bg-[#77dd77]"></span>
              <span className="relative text-black group-hover:text-black">
                submit
              </span>
            </div>
          </div>
          <div className="modal-action">
            <label
              htmlFor="my-modal-6"
              className="relative inline-block px-4 py-2 font-medium group cursor-pointer text-center"
            >
              <span className="absolute inset-0 w-full h-full transition duration-200 ease-out transform translate-x-1 translate-y-1 bg-[#cfcfc4] border-black border-[2px] group-hover:-translate-x-0 group-hover:-translate-y-0"></span>
              <span className="absolute inset-0 w-full h-full bg-white border-2 border-black group-hover:bg-[#cfcfc4]"></span>
              <span className="relative text-black group-hover:text-black">
                close
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Draw;
