const StakingTest = artifacts.require("StakingTest.sol");
const Staking = artifacts.require("Staking.sol");
const ERC20 = artifacts.require("TestERC20.sol");
const truffleAssert = require('truffle-assertions');
const tests = require("@daonomic/tests-common");
const increaseTime = tests.increaseTime;
const { expectThrow } = require("@daonomic/tests-common");

contract("Staking", accounts => {
	let forTest;
	let staking;
	let token;
	let deposite;

	const DAY = 86400;
 	const WEEK = DAY * 7;
 	const MONTH = WEEK * 4;
 	const YEAR = DAY * 365;

	function eventRestakeHandler(resultRestake){
		let idNewLock;
    truffleAssert.eventEmitted(resultRestake, 'reStakeResult', (ev) => {
    	idNewLock = ev.result;
      return true;
    });
    return idNewLock;
	}

	function eventLockHandler(resultLock){
		let idLock;
    truffleAssert.eventEmitted(resultLock, 'createLockResult', (ev) => {
    	idLock = ev.result;
      return true;
    });
    return idLock;
	}

	beforeEach(async () => {
		deposite = accounts[1];
		forTest = await StakingTest.new();
		token = await ERC20.new();
		staking = await Staking.new();
		await staking.__Staking_init(token.address); //initialize, set owner
	})

	describe("Part1. Check base metods Staking contract, createLock, withdraw", () => {

		it("Test1. Try to createLock() and check balance", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			rezultLock  = await forTest._stake(staking.address, accounts[2], accounts[2], 20, 10, 0);
			let idLock;
      truffleAssert.eventEmitted(rezultLock, 'createLockResult', (ev) => {
       	idLock = ev.result;
        return true;
      });

      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[2]);
      let balanceOf;
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
			assert.equal(await token.balanceOf(staking.address), 20);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 80);			//tail user balance
      assert.equal(idLock, 1);
      assert.equal(balanceOf, 20);
		});

		it("Test2. Try to createLock() and check totalBalance", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });

			await forTest._stake(staking.address ,accounts[2], accounts[2], 30, 10, 0);

			let resultTotalBalance = await forTest._totalSupply(staking.address);
			let totalBalance;
      truffleAssert.eventEmitted(resultTotalBalance, 'totalBalanceResult', (ev) => {
       	totalBalance = ev.result;
        return true;
      });
 			assert.equal(await token.balanceOf(staking.address), 30);				//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 70);			//tail user balance
			assert.equal(totalBalance, 30);
		});

		it("Test3. Try to createLock() and check withdraw()", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });

			rezultLock  = await forTest._stake(staking.address ,accounts[2], accounts[2], 30, 10, 0);
			/*3 week later*/
			await increaseTime(WEEK * 3);
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
   		/*one week later*/
			await increaseTime(WEEK);
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock ondeposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
		});

		it("Test4. Try to createLock() and check withdraw(), with cliff", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });

			rezultLock  = await forTest._stake(staking.address ,accounts[2], accounts[2], 30, 10, 3);
			/*3 week later nothing change, because cliff */
			await increaseTime(WEEK * 3);
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 30);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 70);			//tail user balance
   		/*one week later*/
			await increaseTime(WEEK);
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 20);	//balance Lock ondeposite
   		assert.equal(await token.balanceOf(accounts[2]), 80);			//tail user balance
		});

		it("Test5. Try to createLock() and check withdraw(), from another account, no changes", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });

			rezultLock  = await forTest._stake(staking.address ,accounts[2], accounts[2], 30, 10, 0);
			/*one week later*/
			await increaseTime(WEEK);
			staking.withdraw({ from: accounts[3] });
 			assert.equal(await token.balanceOf(staking.address), 30);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 70);			//tail user balance
		});

		it("Test6. Try to createLock() more than 2 year stake, throw", async () => {
			await token.mint(accounts[2], 2000);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
      await expectThrow(
			  forTest._stake(staking.address ,accounts[2], accounts[2], 1050, 10, 0)
			);
		});
	})

	describe("Part2. Check restake() One line only, change slope ", () => {
		it("Test1.1. Change slope, line with cliff, in cliff time", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			resultLock  = await forTest._stake(staking.address ,accounts[2], accounts[2], 30, 10, 3);
 			assert.equal(await token.balanceOf(staking.address), 30);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 70);			//tail user balance

			let idLock = eventLockHandler(resultLock);

			await increaseTime(WEEK * 2); //2 week later nothing change, because cliff
			let newAmount = 30;
			let newSlope = 5;
			let newCliff = 0;
			resultRestake = await forTest._restake(staking.address, idLock, accounts[2], newAmount, newSlope, newCliff);
			let idNewLock = eventRestakeHandler(resultRestake);
 			assert.equal(await token.balanceOf(staking.address), 30);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 70);			//tail user balance

			await increaseTime(WEEK*2); //2 week later
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 20);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 80);			//user balance

			await increaseTime(WEEK*4); //4 week later
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
		});

		it("Test1.2. Change slope, amount, cliff, line with cliff, in cliff time, transfer erc20", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			resultLock  = await forTest._stake(staking.address ,accounts[2], accounts[2], 30, 10, 3);
 			assert.equal(await token.balanceOf(staking.address), 30);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 70);			//tail user balance

			let idLock = eventLockHandler(resultLock);

			await increaseTime(WEEK * 2); //2 week later nothing change, because cliff
			let newAmount = 80;
			let newSlope = 5;
			let newCliff = 6;
			resultRestake = await forTest._restake(staking.address, idLock, accounts[2], newAmount, newSlope, newCliff);
			let idNewLock = eventRestakeHandler(resultRestake);
 			assert.equal(await token.balanceOf(staking.address), 80);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 20);			//tail user balance

			await increaseTime(WEEK*6); //6 week later
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 80);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 20);			//user balance

			await increaseTime(WEEK*16); //16 week later
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
		});

		it("Test2. Change slope, line with cliff, in slope time", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			resultLock  = await forTest._stake(staking.address ,accounts[2], accounts[2], 30, 10, 3);
			let idLock = eventLockHandler(resultLock);

			await increaseTime(WEEK * 4); //4 week later change, because slope
			let newAmount = 30;
			let newSlope = 5;
			let newCliff = 0;
			resultRestake = await forTest._restake(staking.address, idLock, accounts[2], newAmount, newSlope, newCliff);
			let idNewLock = eventRestakeHandler(resultRestake);
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 30);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 70);			//tail user balance

			await increaseTime(WEEK*6); //2 week later
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//user balance

		});

		it("Test3. Change slope, amount, cliff, with cliff, in tail time, enough ERC20 for restake", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			resultLock  = await forTest._stake(staking.address ,accounts[2], accounts[2], 37, 10, 3);
			let idLock = eventLockHandler(resultLock);

			await increaseTime(WEEK * 6); //4 week later change, because slope
			let newAmount = 10;
			let newSlope = 5;
			let newCliff = 2;
			resultRestake = await forTest._restake(staking.address, idLock, accounts[2], newAmount, newSlope, newCliff);
			let idNewLock = eventRestakeHandler(resultRestake);
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 10);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 90);			//tail user balance

			await increaseTime(WEEK*2); //2 week later cliff works nothing changebias>newSlope
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 10);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 90);			//user balance

			await increaseTime(WEEK*2);
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
		});

		it("Test4. Change slope, cliff, amount, line with cliff, in tail time, additionally transfer ERC20 for restake", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			resultLock  = await forTest._stake(staking.address ,accounts[2], accounts[2], 37, 10, 3);
			let idLock = eventLockHandler(resultLock);

			await increaseTime(WEEK * 6); //4 week later change, because slope
			staking.withdraw({ from: accounts[2] });
			let newAmount = 10;
			let newSlope = 5;
			let newCliff = 2;
			resultRestake = await forTest._restake(staking.address, idLock, accounts[2], newAmount, newSlope, newCliff);
			let idNewLock = eventRestakeHandler(resultRestake);

 			assert.equal(await token.balanceOf(staking.address), 10);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 90);			//tail user balance

			await increaseTime(WEEK*2); //2 week later cliff works nothing changebias>newSlope
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 10);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 90);			//user balance

			await increaseTime(WEEK*2);
			staking.withdraw({ from: accounts[2] });
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
		});

		it("Test5. Change slope, amount, with cliff, in tail time, less amount, then now is, throw", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			resultLock  = await forTest._stake(staking.address ,accounts[2], accounts[2], 38, 10, 3);
			let idLock = eventLockHandler(resultLock);

			await increaseTime(WEEK * 6); //6 week later change, because slope
			let newAmount = 5;
			let newSlope = 5;
			let newCliff = 2;
			await expectThrow(
				forTest._restake(staking.address, idLock, accounts[2], newAmount, newSlope, newCliff)
			);
		});

		it("Test6. Change slope, amount, with cliff, in cliff time, New line period stake too short, throw", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			resultLock  = await forTest._stake(staking.address ,accounts[2], accounts[2], 38, 10, 3);
			let idLock = eventLockHandler(resultLock);

			await increaseTime(WEEK * 2); //2 week later no change, because cliff
			let newAmount = 5;
			let newSlope = 5;
			let newCliff = 2;
			await expectThrow(
				forTest._restake(staking.address, idLock, accounts[2], newAmount, newSlope, newCliff)
			);
		});

	})

	describe("Part3. Check restake metods Staking() Two and more lines ", () => {
		it("Test1. Two Lines. Change slope, amount, with cliff, in cliff time", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			await token.mint(accounts[3], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[3] });

			let resultLock1  = await forTest._stake(staking.address ,accounts[2], accounts[2], 30, 10, 3);
			let idLock1 = eventLockHandler(resultLock1);
			let resultLock2  = await forTest._stake(staking.address ,accounts[3], accounts[3], 50, 10, 3);
			let idLock2 = eventLockHandler(resultLock2);

			await increaseTime(WEEK * 2); //2 week later nothing change, because cliff
			let newAmount = 50;
			let newSlope = 5;
			let newCliff = 0;
			resultRestake = await forTest._restake(staking.address, idLock2, accounts[3], newAmount, newSlope, newCliff);
			let idNewLock = eventRestakeHandler(resultRestake);
 			assert.equal(await token.balanceOf(staking.address), 80);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 70);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 50);			//tail user balance

			await increaseTime(WEEK); //1 week later
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
 			assert.equal(await token.balanceOf(staking.address), 75);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 70);			//user balance
   		assert.equal(await token.balanceOf(accounts[3]), 55);			//user balance

			await increaseTime(WEEK); //1 week later
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
 			assert.equal(await token.balanceOf(staking.address), 60);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 80);			//user balance
   		assert.equal(await token.balanceOf(accounts[3]), 60);			//user balance

			await increaseTime(WEEK*2); //2 week later finish Line
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
 			assert.equal(await token.balanceOf(staking.address), 30);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 70);			//tail user balance

			await increaseTime(WEEK*6); //6 week later
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 100);			//tail user balance
		});

		it("Test2. 3 Lines. Change slope, amount, with cliff, in cliff time", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			await token.mint(accounts[3], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[3] });
			await token.mint(accounts[4], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[4] });

			let resultLock1  = await forTest._stake(staking.address ,accounts[2], accounts[2], 20, 5, 2);
			let idLock1 = eventLockHandler(resultLock1);
			let resultLock2  = await forTest._stake(staking.address ,accounts[3], accounts[3], 30, 10, 3);
			let idLock2 = eventLockHandler(resultLock2);
			let resultLock3  = await forTest._stake(staking.address ,accounts[4], accounts[4], 40, 10, 4);
			let idLock3 = eventLockHandler(resultLock3);

			await increaseTime(WEEK * 4); //4 week later nothing change, because cliff
			let newAmount = 30;
			let newSlope = 5;
			let newCliff = 1;
			resultRestake = await forTest._restake(staking.address, idLock2, accounts[3], newAmount, newSlope, newCliff);
			let idNewLock = eventRestakeHandler(resultRestake);
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
			staking.withdraw({ from: accounts[4] });
 			assert.equal(await token.balanceOf(staking.address), 80);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 90);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 70);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[4]), 60);			//tail user balance

			await increaseTime(WEEK); //1 week later
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
			staking.withdraw({ from: accounts[4] });
 			assert.equal(await token.balanceOf(staking.address), 65);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 95);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 70);			//tail user balance clif work
   		assert.equal(await token.balanceOf(accounts[4]), 70);			//tail user balance

			await increaseTime(WEEK); //1 week later
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
			staking.withdraw({ from: accounts[4] });
 			assert.equal(await token.balanceOf(staking.address), 45);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 75);			//tail user balance clif work
   		assert.equal(await token.balanceOf(accounts[4]), 80);			//tail user balance

			await increaseTime(WEEK*2); //2 week later finish Line
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
			staking.withdraw({ from: accounts[4] });
 			assert.equal(await token.balanceOf(staking.address), 15);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 85);			//tail user balance clif work
   		assert.equal(await token.balanceOf(accounts[4]), 100);			//tail user balance

			await increaseTime(WEEK*3); //3 week later
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
			staking.withdraw({ from: accounts[4] });
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[4]), 100);			//tail user balance
		});

		it("Test3. 3 Lines. Change slope, amount, with cliff, in tail time", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			await token.mint(accounts[3], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[3] });
			await token.mint(accounts[4], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[4] });

			let resultLock1  = await forTest._stake(staking.address ,accounts[2], accounts[2], 20, 5, 2);
			let idLock1 = eventLockHandler(resultLock1);
			let resultLock2  = await forTest._stake(staking.address ,accounts[3], accounts[3], 32, 10, 3);
			let idLock2 = eventLockHandler(resultLock2);
			let resultLock3  = await forTest._stake(staking.address ,accounts[4], accounts[4], 40, 10, 4);
			let idLock3 = eventLockHandler(resultLock3);

			await increaseTime(WEEK * 6); //6 week later nothing change, because cliff
			let newAmount = 22;
			let newSlope = 5;
			let newCliff = 1;
			resultRestake = await forTest._restake(staking.address, idLock2, accounts[3], newAmount, newSlope, newCliff);
			let idNewLock = eventRestakeHandler(resultRestake);
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
			staking.withdraw({ from: accounts[4] });
 			assert.equal(await token.balanceOf(staking.address), 42);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 78);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[4]), 80);			//tail user balance

			await increaseTime(WEEK); //2 week later
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
			staking.withdraw({ from: accounts[4] });
 			assert.equal(await token.balanceOf(staking.address), 32);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 78);			//tail user balance clif work
   		assert.equal(await token.balanceOf(accounts[4]), 90);			//tail user balance

			await increaseTime(WEEK); // week later
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
			staking.withdraw({ from: accounts[4] });
 			assert.equal(await token.balanceOf(staking.address), 17);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 83);			//tail user balance clif work
   		assert.equal(await token.balanceOf(accounts[4]), 100);			//tail user balance

			await increaseTime(WEEK*4); //4 week later
			staking.withdraw({ from: accounts[2] });
			staking.withdraw({ from: accounts[3] });
			staking.withdraw({ from: accounts[4] });
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[3]), 100);			//tail user balance
   		assert.equal(await token.balanceOf(accounts[4]), 100);			//tail user balance
		});
	})

	describe("Part4. Check restake() with delegation ", () => {

		it("Test1. CreateLock() and check balance delegated stRari", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			rezultLock  = await forTest._stake(staking.address, accounts[2], accounts[3], 60, 2, 0);
			let idLock;
      truffleAssert.eventEmitted(rezultLock, 'createLockResult', (ev) => {
       	idLock = ev.result;
        return true;
      });

      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      let balanceOf;
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
			assert.equal(await token.balanceOf(staking.address), 60);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 40);			//tail user balance
      assert.equal(idLock, 1);
      assert.equal(balanceOf, 240);

      await increaseTime(WEEK*29); //29 week later
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 8);
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 2);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 98);			//tail user balance

  		await increaseTime(WEEK); // week later
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 0);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
		});

		it("Test2. CreateLock() and check balance delegated stRari, after that redelegate", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			rezultLock  = await forTest._stake(staking.address, accounts[2], accounts[3], 60, 2, 0);  //first time stake
			let idLock;
      truffleAssert.eventEmitted(rezultLock, 'createLockResult', (ev) => {
       	idLock = ev.result;
        return true;
      });

      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      let balanceOf;
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
			assert.equal(await token.balanceOf(staking.address), 60);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 40);			//tail user balance
      assert.equal(idLock, 1);
      assert.equal(balanceOf, 240);

      await increaseTime(WEEK*20); //20 week later
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 80);
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 20);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 80);			//tail user balance

			let newAmount = 20;
			let newSlope = 2;
			let newCliff = 0;
			resultRestake = await forTest._restake(staking.address, idLock, accounts[4], newAmount, newSlope, newCliff);
			let idNewLock = eventRestakeHandler(resultRestake);

      resultBalanceOfValueAccount_3  = await forTest._balanceOf(staking.address, accounts[3]); //for check balance accounts[3]
      truffleAssert.eventEmitted(resultBalanceOfValueAccount_3, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);

      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[4]); //for check balance accounts[4]
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 20);

  		await increaseTime(WEEK*10); //10 week later
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 0);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
		});

		it("Test3. CreateLock() and check balance delegated stRari, unknown idLine, throw", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			rezultLock  = await forTest._stake(staking.address, accounts[2], accounts[3], 60, 2, 0);  //first time stake
			let idLock;
      truffleAssert.eventEmitted(rezultLock, 'createLockResult', (ev) => {
       	idLock = ev.result;
        return true;
      });
      await increaseTime(WEEK*30); //20 week later
			let newAmount = 30;
			let newSlope = 2;
			let newCliff = 0;
			staking.withdraw({ from: accounts[2] });
			let idLockUndefined = 4;
		  await expectThrow(
		    forTest._restake(staking.address, idLockUndefined, accounts[4], newAmount, newSlope, newCliff)
		  );
		});
  })

	describe("Part5. Check delegate()", () => {

		it("Test1. CreateLock() and check balance delegated stRari, after redelegate", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			rezultLock = await forTest._stake(staking.address, accounts[2], accounts[3], 60, 2, 0);  //first time stake
			let idLock;
      truffleAssert.eventEmitted(rezultLock, 'createLockResult', (ev) => {
       	idLock = ev.result;
        return true;
      });

      resultBalanseOfValue = await forTest._balanceOf(staking.address, accounts[3]);
      let balanceOf;
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
			assert.equal(await token.balanceOf(staking.address), 60);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 40);			//tail user balance
      assert.equal(idLock, 1);
      assert.equal(balanceOf, 240);

      await increaseTime(WEEK*20); //20 week later
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 80);                                    //miss user balance stRari
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 20);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 80);

		  await forTest._delegate(staking.address, idLock, accounts[4]);  //delegate from accounts[3]

      resultBalanceOfValueAccount_3  = await forTest._balanceOf(staking.address, accounts[3]); //for check balance accounts[3]
      truffleAssert.eventEmitted(resultBalanceOfValueAccount_3, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);     //stRary balance accounts[3], after _delegate

      resultBalanseOfValue = await forTest._balanceOf(staking.address, accounts[4]); //for check balance accounts[4]
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 80);    //stRary balance accounts[4], after _delegate

  		await increaseTime(WEEK*10); //10 week later
      resultBalanseOfValue = await forTest._balanceOf(staking.address, accounts[4]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 0);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
		});

		it("Test2. CreateLock() and check balance delegated stRari, in tail time, after redelegate", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			rezultLock = await forTest._stake(staking.address, accounts[2], accounts[3], 63, 10, 0);  //first time stake
			let idLock;
      truffleAssert.eventEmitted(rezultLock, 'createLockResult', (ev) => {
       	idLock = ev.result;
        return true;
      });

      resultBalanseOfValue = await forTest._balanceOf(staking.address, accounts[3]);
      let balanceOf;
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
			assert.equal(await token.balanceOf(staking.address), 63);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 37);			//tail user balance
      assert.equal(idLock, 1);
      assert.equal(balanceOf, 63);

      await increaseTime(WEEK*6); //20 week later
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 3);
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 3);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 97);

		  await forTest._delegate(staking.address, idLock, accounts[4]);  //delegate from accounts[3]

      resultBalanceOfValueAccount_3  = await forTest._balanceOf(staking.address, accounts[3]); //for check balance accounts[3]
      truffleAssert.eventEmitted(resultBalanceOfValueAccount_3, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);     //stRary balance accounts[3], after _delegate

      resultBalanseOfValue = await forTest._balanceOf(staking.address, accounts[4]); //for check balance accounts[4]
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 3);    //stRary balance accounts[4], after _delegate

  		await increaseTime(WEEK); //1 week later
      resultBalanseOfValue = await forTest._balanceOf(staking.address, accounts[4]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 0);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
		});

		it("Test3. CreateLock() and check totalBalance, balance delegated stRari, after that redelegate and redelegate back", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			rezultLock  = await forTest._stake(staking.address, accounts[2], accounts[3], 60, 2, 0);  //first time stake
			let idLock;
      truffleAssert.eventEmitted(rezultLock, 'createLockResult', (ev) => {
       	idLock = ev.result;
        return true;
      });
      //check balances after _stake()
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      let balanceOf;
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      resultBalanseTotal  = await forTest._totalSupply(staking.address); //totalBalance check
      let balanceTotal;
      truffleAssert.eventEmitted(resultBalanseTotal, 'totalBalanceResult', (ev) => {
      	balanceTotal = ev.result;
        return true;
      });
			assert.equal(await token.balanceOf(staking.address), 60);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 40);			//tail user balance
      assert.equal(idLock, 1);
      assert.equal(balanceOf, 240);
      assert.equal(balanceTotal, 240);

      await increaseTime(WEEK*20); //20 week later
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 80);
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 20);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 80);			      //miss user balance stRari

		  await forTest._delegate(staking.address, idLock, accounts[4]);  //delegate from accounts[3] to accounts[4]
      resultBalanceOfValueAccount_3  = await forTest._balanceOf(staking.address, accounts[3]); //for check balance accounts[3]
      truffleAssert.eventEmitted(resultBalanceOfValueAccount_3, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);     //stRary balance accounts[3], after _delegate()

      resultBalanceOfValueAccount_4  = await forTest._balanceOf(staking.address, accounts[4]); //for check balance accounts[4]
      truffleAssert.eventEmitted(resultBalanceOfValueAccount_4, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 80);    //stRary balance accounts[3], after _delegate()

  		await increaseTime(WEEK*5); //5 week later
		  await forTest._delegate(staking.address, idLock, accounts[3]);  //delegate from accounts[4] to accounts[3] (delegate back)
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[4]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 40);
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 10);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 90);			//tail user balance

  		await increaseTime(WEEK*5); //5 week later
      resultBalanseOfValue  = await forTest._balanceOf(staking.address, accounts[3]);
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);
      staking.withdraw({ from: accounts[2] });
			assert.equal(await token.balanceOf(staking.address), 0);				//balance Lock on deposite
  		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
      resultBalanseTotal  = await forTest._totalSupply(staking.address);
      balanceTotal;
      truffleAssert.eventEmitted(resultBalanseTotal, 'totalBalanceResult', (ev) => {  //totalBalance check
      	balanceTotal = ev.result;
        return true;
      });
  		assert.equal(balanceTotal, 0);
		});

		it("Test4. CreateLock() and check balance delegated stRari, after finish time Line, throw", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			rezultLock  = await forTest._stake(staking.address, accounts[2], accounts[3], 60, 2, 0);  //first time stake
			let idLock;
      truffleAssert.eventEmitted(rezultLock, 'createLockResult', (ev) => {
       	idLock = ev.result;
        return true;
      });
      await increaseTime(WEEK*30); //20 week later
		  await expectThrow(
		    forTest._delegate(staking.address, idLock, accounts[4])  //delegate from accounts[3]
		  );
		});

  })

	describe("Part6. Check setStopLock()", () => {

		it("Test1. CreateLock() and check account and total balance stRari, after setStopLock", async () => {
			await token.mint(accounts[2], 100);
   		await token.approve(staking.address, 1000000, { from: accounts[2] });
			rezultLock = await forTest._stake(staking.address, accounts[2], accounts[3], 60, 2, 0);  //first time stake
			let idLock;
      truffleAssert.eventEmitted(rezultLock, 'createLockResult', (ev) => {
       	idLock = ev.result;
        return true;
      });
      await staking.setStopLock(true);    //STOP!!! only owner
      resultBalanseOfValue = await forTest._balanceOf(staking.address, accounts[3]); //check balance account
      let balanceOf;
      truffleAssert.eventEmitted(resultBalanseOfValue, 'balanceOfResult', (ev) => {
      	balanceOf = ev.result;
        return true;
      });
      assert.equal(balanceOf, 0);
 			assert.equal(await token.balanceOf(staking.address), 60);				//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 40);			//tail user balance


      resultBalanseOfValue = await forTest._totalSupply(staking.address); //check balance total
      let totalBalance;
      truffleAssert.eventEmitted(resultBalanseOfValue, 'totalBalanceResult', (ev) => {
      	totalBalance = ev.result;
        return true;
      });
      assert.equal(totalBalance, 0);

			rezultLock = await forTest._stake(staking.address, accounts[2], accounts[4], 60, 2, 0);  //check stake
			let idLock2;
      truffleAssert.eventEmitted(rezultLock, 'createLockResult', (ev) => {
       	idLock2 = ev.result;
        return true;
      });
      assert.equal(idLock2, 0);
			assert.equal(await token.balanceOf(staking.address), 60);				//balance contract dont change
  		assert.equal(await token.balanceOf(accounts[2]), 40);			//balance user balance

			let newAmount = 30;       //check restake
			let newSlope = 5;
			let newCliff = 0;
			resultRestake = await forTest._restake(staking.address, idLock, accounts[5], newAmount, newSlope, newCliff);
			let idNewLock = eventRestakeHandler(resultRestake);
      assert.equal(idLock2, 0);
			assert.equal(await token.balanceOf(staking.address), 60);				//balance contract dont change
  		assert.equal(await token.balanceOf(accounts[2]), 40);			//balance user balance

			staking.withdraw({ from: accounts[2] });  //chek withdraw
 			assert.equal(await token.balanceOf(staking.address), 0);	//balance Lock on deposite
   		assert.equal(await token.balanceOf(accounts[2]), 100);			//tail user balance
		});

  })
})