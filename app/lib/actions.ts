'use server';
import { sql } from "@vercel/postgres";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.'
    }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.'}),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status'
    }),
    date: z.string(),
});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
    const rawFormData = Object.fromEntries(formData.entries());

    const validateFields = CreateInvoice.safeParse(rawFormData);

    if(!validateFields.success){
        return {
            errors: validateFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to create invoice.'
        };
    }

    const { customerId, amount, status } = validateFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (err) {
        return {
            message: "DataBase Error: Failed to Create Invoice."
        }
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, formData: FormData) {
    const rawFormData = Object.fromEntries(formData.entries());

    const { customerId, amount, status } = UpdateInvoice.parse(rawFormData);
    const amountInCents = amount * 100;

    try {
        await sql`
        UPDATE invoices
        SET customer_id=${customerId}, amount=${amountInCents}, status=${status}
        WHERE id=${id}
        `;
    } catch (err) {
        return {
            message: "DataBase Error: Failed to Update Invoice."
        }
    }

    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
    throw new Error("Failed to Delete the Invoice");

    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices');
        return { message: 'Deleted Invoice.' };
    } catch (err) {
        return {
            message: "DataBase Error: Failed to Delete Invoice."
        }
    }
}

