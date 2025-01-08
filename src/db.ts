import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async (): Promise<void> => {
    const url = process.env.DATABASE_URL || "";
    try {
        await mongoose.connect(url);
        console.log('Banco de dados conectado');
    } catch (err: any) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        process.exit(1);
    }
}

export default connectDB;