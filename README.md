# crypto-tax-calc

**Welcome to crypto-tax-calc!**

Manually track of your trades, swaps, and transfers and use `ctc.ts` to quickly find out what your tax liability is for any financial year.

## Entry Structure

An entry is a record of operation. Records make up a trading history. Trading history within a financial year determine your tax liability. There are 4 types of entries:

- `TRADE` - A swap between two tokens or fiat and token
- `TRANSFER` - Moving a token from CEX to wallet or wallet to wallet
- `DEPOSIT` - On-ramping fiat to defi
- `WITHDRAW` - Off-ramping fiat back to some traditional banking system

Each entry has their own structure but all fit into a single table for easy manual entry. The overall structure looks like this:

```
dt,exchange,type,receive_qty,receive_token,sent_qty,sent_token,fees,fee_currency,receive_1x_fiat,sent_1x_fiat,fee_1x_fiat
```

| column            | type     | description                                                             |
| :---------------- | :------- | :---------------------------------------------------------------------- |
| `dt`              | datetime | Date and time this entry occurred                                       |
| `exchange`        | string   | DEX or CEX it occurred on                                               |
| `exchange_dest`   | string   | DEX or CEX the transfer                                                 |
| `receive_qty`     | float    | Amount of tokens received/bought                                        |
| `receive_token`   | string   | The type of token received ETH/DOT/SOL etc.                             |
| `sent_qty`        | float    | Amount of tokens sent/sold                                              |
| `sent_token`      | string   | The type of token sent                                                  |
| `fees`            | float    | Sum of all taxes, gas fees, slippage, etc.                              |
| `fees_currency`   | string   | The token the fees are represented in e.g. BNB/ETH/SOL                  |
| `receive_1x_fiat` | float    | Value of a single `receive_token` in fiat e.g. 1x ETH at $3000 USD      |
| `sent_1x_fiat`    | float    | Value of a single `sent_token` in fiat e.g. 1x BUSD in AUD is $1.42 AUD |
| `fee_1x_fiat`     | float    | Same as `{receive,sent}_1x_fiat` except for fees                        |

_**NOTE:** It's important for all `_1x_fiat` values use the same fiat currency. I'm from Australia so I use AUD and look at the rough exchange rate at the time of entry to calculate the value of `1x` token._

Depending on the `type` of entry, some columns may or may not be missing and some records may expect an accompanying record. The examples below all use AUD as the `1x_fiat` currency and `dt` is UTC+11/+10.

### Example `TRADE`

| dt                  | exchange | exchange_dest | type  | receive_qty | receive_token | sent_qty | sent_token | fees | fee_currency | receive_1x_fiat | sent_1x_fiat | fee_1x_fiat |
| ------------------- | -------- | ------------- | ----- | ----------- | ------------- | -------- | ---------- | ---- | ------------ | --------------- | ------------ | ----------- |
| 2022/04/01 15:55:30 | Binance  |               | TRADE | 3,849.00    | GALA          | 1,000.00 | USDT       | 0.15 | USDT         | 0.35            | 1.33         | 1.33        |

In this example, I purchase 3849 GALA tokens for 1000 USDT on Binance at roughly 3:55PM, paying 0.15 USDT fee on the trade. Each GALA is valued at 0.35c AUD and the value of 1 USDT is 1.33 AUD.

Note for tax purposes, any trade which _does not_ involve fiat will automatically be split into 2 separate entries internally. Here, we consider this trade as **(1)** selling USDT for AUD at $1.33 AUD per token then **(2)** buying GALA at 0.35 AUD per token. We determine this by looking at `receive_token` and `sent_token`.

### Example `TRANSFER`

Moving tokens between wallets generally _do not_ incur taxes (_not financial advice_). So they generally do not need to be traced.

However, it's rarely free to move funds around in defi. You almost always have to pay gas. Movement of tokens, specially from centralised exchanges or on the Ethereum network incurs gas and gas fees are tax deductible so I track them to help reduce GCT (capital gains tax).

| dt                  | exchange      | exchange_dest | type     | receive_qty | receive_token | sent_token | fees | fee_currency | receive_1x_fiat | sent_1x_fiat | fee_1x_fiat |
| ------------------- | ------------- | ------------- | -------- | ----------- | ------------- | ---------- | ---- | ------------ | --------------- | ------------ | ----------- |
| 2022/04/20 17:10:12 | Terra Station | Binance       | TRANSFER | 30,000.00   | UST           | 30,000.00  | UST  | 0.02         | UST             | 1.34         | 1.34        |

In this example, 30,000 UST tokens were transferred to a wallet owned by Binance from a wallet viewed through Terra Station. The value of one UST is 1.34 AUD and I paid 0.02 UST in gas fees to make the transfer which took place around 5:10PM.

### Example `DEPOSIT` / `WITHDRAW`

Both of these entry types also don't need to be tracked. However, it can be informative to understand how much has been on-ramped, off-ramped, and principal in circulation.

| dt                  | exchange | type    | receive_qty | receive_token | sent_qty | sent_token | fees | fee_currency | receive_1x_fiat | sent_1x_fiat | fee_1x_fiat |
| ------------------- | -------- | ------- | ----------- | ------------- | -------- | ---------- | ---- | ------------ | --------------- | ------------ | ----------- |
| 2021/10/20 22:12:19 | Binance  | DEPOSIT | 15,000.00   | AUD           |          |            |      |              |                 |              |             |

15,000 AUD on-ramped via Binance around 10:12PM on 20th of Oct, 2021.

| dt                  | exchange | type     | receive_qty | receive_token | sent_qty | sent_token | fees | fee_currency | receive_1x_fiat | sent_1x_fiat | fee_1x_fiat |
| ------------------- | -------- | -------- | ----------- | ------------- | -------- | ---------- | ---- | ------------ | --------------- | ------------ | ----------- |
| 2022/04/30 09:50:01 | Binance  | WITHDRAW | 15,000.00   | AUD           |          |            |      |              |                 |              |             |

15,000 AUD was off-ramped via Binance at 9:50AM on the 30th of Apr, 2022.

Binance Australia is connected allows users to connect with PayID and _does not_ incur any fee on withdrawls. However, if your off-ramp does incur fees, they can be added to `fees`, `fee_currency` and `fee_1x_fiat`.

---

You'll notice this _does not_ track staking, liquid staking, airdrops, lockdrops, rebase tokens, LP farming, lending, borrowing, options, and many other areas of defi. Why? I think it's impossible or simply too difficult to track these types of entries manually. Moreover, it's also quite difficult to formalise a standard structure that's both easy to manually input, allows for extensibility, and easy to interpret right now.

## Development

Clone repository:

```bash
git@github.com:davidvuong/crypto-tax-calc.git
```

Install dependencies:

```bash
npm i
```

Execute `ctc`:

```
> npm start -- --help
Usage: ctc.ts [options] <trx_path>

Crypto Tax Calculator (ctc) - calculate your tax liability

Options:
  -V, --version         output the version number
  -p --period <period>  financial year period (e.g. 2021-07..2022-06)
  -h, --help            display help for command
```
