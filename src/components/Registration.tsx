import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

const registrationSchema = z.object({
    registration: z.string().trim().min(1, "Registration is required").max(20, "Max 20 characters"),
    status: z.enum(["active", "inactive"]),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const Registration: React.FC = () => {
    const form = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            registration: "",
            status: "active",
        },
    });

    const onSubmit = (data: RegistrationFormData) => {
        // TODO: Integrate with Supabase
        form.reset();
    };

    return (
        <div className="max-w-md mx-auto mt-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">Register Aircraft</CardTitle>
                    <CardDescription>
                        Add a new aircraft registration and set its status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="registration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Registration *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="N747BA" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status *</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="inactive">Inactive</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full">Register</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
};

export default Registration;