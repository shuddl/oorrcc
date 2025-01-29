import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, CreateUserInput } from '@fullstack/shared';
import { FormField, Button } from '../components/Form';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema)
  });

  const registerMutation = useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const response = await api.post('/users', data);
      return response.data;
    },
    onSuccess: () => {
      navigate('/login');
    }
  });

  const onSubmit = (data: CreateUserInput) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <FormField
              label="Name"
              name="name"
              register={register}
              error={errors.name?.message}
              required
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              register={register}
              error={errors.email?.message}
              required
            />
            <FormField
              label="Password"
              name="password"
              type="password"
              register={register}
              error={errors.password?.message}
              required
            />
          </div>

          {registerMutation.error && (
            <div className="text-red-500 text-sm text-center">
              {registerMutation.error.message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            isLoading={registerMutation.isPending}
          >
            Create account
          </Button>
        </form>
      </div>
    </div>
  );
};