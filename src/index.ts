import express, { Request, Response, NextFunction, response } from "express"
import { v4 as uuidv4 } from "uuid"

const PORT = 3333
const app = express()
app.use(express.json())

interface Customer {
  id: string
  name: string
  cpf: string
  statement: StatementOperation[]
}

const customers: Customer[] = []

interface CustomRequest extends Request {
  customer?: Customer
}

interface StatementOperation {
  description?: string
  amount: number
  createdAt: Date
  type: string
}

// Middleware
function verifyIfExistsAccountCPF(request: CustomRequest, response: Response, next: NextFunction) {
  const { cpf } = request.headers

  const customer = customers.find((customer) => customer.cpf === cpf)

  if (!customer) {
    return response.status(400).json({ error: "Customer not found!" })
  }

  request.customer = customer

  return next()
}

function getBalance(statement: StatementOperation[]) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount
    } else {
      return acc - operation.amount
    }
  }, 0)

  return balance
}

app.post("/account", (request, response) => {
  const { cpf, name } = request.body

  const customersAlreadyExists = customers.some((customer) => customer.cpf === cpf)

  if (customersAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists!" })
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  })

  return response.status(201).send()
})

app.get("/statement", verifyIfExistsAccountCPF, (request: CustomRequest, response) => {
  const { customer } = request

  if (!customer) {
    return response.status(400).send()
  }

  return response.json(customer.statement)
})

app.post("/deposit", verifyIfExistsAccountCPF, (request: CustomRequest, response) => {
  const { description, amount } = request.body

  const { customer } = request

  if (!customer) {
    return response.status(400).send()
  }

  const statementOperation = {
    description,
    amount,
    createdAt: new Date(),
    type: "credit",
  }

  customer.statement.push(statementOperation)

  return response.status(201).send()
})

app.post("/withdraw", verifyIfExistsAccountCPF, (request: CustomRequest, response) => {
  const { amount } = request.body

  const { customer } = request

  if (!customer) {
    return response.status(400).send()
  }

  const balance = getBalance(customer.statement)

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient found!" })
  }

  const statementOperation = {
    amount,
    createdAt: new Date(),
    type: "debit",
  }

  customer.statement.push(statementOperation)

  return response.status(201).send()
})

app.listen(PORT, () => console.log("Server is running..."))
