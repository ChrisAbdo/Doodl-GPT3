import React, { useState, useEffect } from 'react';
import Marquee from 'react-fast-marquee';
import Marketplace from '../backend/build/contracts/Marketplace.json';
import NFT from '../backend/build/contracts/NFT.json';
import Web3 from 'web3';

const index = () => {
  const [account, setAccount] = useState(null);
  const [prizePool, setPrizePool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState([]);
  const [prompt, setPrompt] = useState(null);
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [timer, setTimer] = useState(null);
  useEffect(() => {
    loadBlockchainData();
    getPromptAndTime();
    loadNFTs();
  }, []);

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

  const loadBlockchainData = async () => {
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);
    } catch (err) {
      console.log(err);
    }
  };

  async function loadNFTs() {
    setLoading(true);

    const web3 = new Web3(window.ethereum);

    const networkId = await web3.eth.net.getId();

    // Get all listed NFTs
    const marketPlaceContract = new web3.eth.Contract(
      Marketplace.abi,
      Marketplace.networks[networkId].address
    );
    const listings = await marketPlaceContract.methods.getListedNfts().call();
    // Iterate over the listed NFTs and retrieve their metadata
    const nfts = await Promise.all(
      listings.map(async (i) => {
        try {
          const NFTContract = new web3.eth.Contract(
            NFT.abi,
            NFT.networks[networkId].address
          );
          const tokenURI = await NFTContract.methods.tokenURI(i.tokenId).call();
          const meta = await axios.get(tokenURI);
          const nft = {
            price: i.price,
            tokenId: i.tokenId,
            seller: i.seller,
            owner: i.buyer,
            image: meta.data.image,
            name: meta.data.name,
          };

          return nft;
        } catch (err) {
          console.log(err);
          return null;
        }
      })
    );
    setNfts(nfts.filter((nft) => nft !== null));
    setLoading(false);
    // const prizePool should be the highest token id * 0.0001, only display 4 decimals

    const prizePool = nfts.length * 0.0001;
    setPrizePool((nfts.length * 0.0001).toFixed(4));
  }
  return (
    <>
      <Marquee
        gradient={false}
        speed={100}
        className="border-b border-t border-black "
      >
        <div className="stats shadow">
          <div className="stat place-items-center">
            <div className="stat-title text-black">Prompt</div>
            <div className="stat-value">{prompt}</div>
          </div>

          <div className="stat place-items-center">
            <div className="stat-title">Prize Pool (MATIC)</div>
            <div className="stat-value text-secondary">{prizePool}</div>
          </div>
          <div className="stat place-items-center">
            <div className="stat-title text-black">Prompt</div>
            <div className="stat-value">{prompt}</div>
          </div>

          <div className="stat place-items-center">
            <div className="stat-title">Prize Pool (MATIC)</div>
            <div className="stat-value text-secondary">{prizePool}</div>
          </div>
          <div className="stat place-items-center">
            <div className="stat-title text-black">Prompt</div>
            <div className="stat-value">{prompt}</div>
          </div>

          <div className="stat place-items-center">
            <div className="stat-title">Prize Pool (MATIC)</div>
            <div className="stat-value text-secondary">{prizePool}</div>
          </div>
        </div>
      </Marquee>

      <div className="hero bg-base-200">
        <div className="hero-content flex-col lg:flex-row-reverse">
          <img
            src="https://placeimg.com/260/400/arch"
            className="max-w-sm rounded-lg shadow-2xl"
          />
          <div>
            <div className="flex flex-col space-y-2 text-5xl sm:text-6xl font-bold">
              <h1 className="font-bold text-[#FF6F91]">
                <span className="text-black">one</span>
                &nbsp;prompt.
              </h1>
              <h1 className="font-bold text-[#8D80C4]">
                <span className="text-black">one</span>
                &nbsp;day.
              </h1>
              <h1 className="font-bold text-[#3ace3a]">
                <span className="text-black">one</span>
                &nbsp;winner.
              </h1>
            </div>
            <p className="py-6 text-2xl text-truncate max-w-md">
              Draw the prompt and create a beautiful piece of art. Vote for the
              best doodl at the end of the day.
            </p>
            <button className="btn btn-primary">Get Started</button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mx-auto py-12 bg-base-200 border border-black w-1/2 mt-4">
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
    </>
  );
};

export default index;
